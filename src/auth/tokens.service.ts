import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { DATABASE } from "../database/database.module";
import type { AppDb } from "../database/db";
import { Env } from "../config/env.schema";
import type { Role } from "../common/decorators/roles.decorator";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role: Role;
  jti: string;
};

export type RefreshTokenContext = {
  userAgent?: string | null;
  ip?: string | null;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
};

@Injectable()
export class TokensService {
  constructor(
    @Inject(DATABASE) private readonly db: AppDb,
    private readonly jwt: JwtService,
    private readonly env: Env,
  ) {}

  private hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private ttlToMs(ttl: string): number {
    // Accept e.g. "15m", "30d", "3600s", "2h"
    const match = ttl.match(/^(\d+)\s*([smhd])$/i);
    if (!match) throw new Error(`Invalid TTL '${ttl}'`);
    const n = Number(match[1]);
    const unit = match[2].toLowerCase();
    const map: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return n * map[unit];
  }

  signAccessToken(user: { id: string; email: string; role: Role }): {
    token: string;
    expiresAt: Date;
  } {
    const jti = randomUUID();
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti,
    };
    const expiresAt = new Date(Date.now() + this.ttlToMs(this.env.JWT_ACCESS_TTL));
    const token = this.jwt.sign(payload, {
      secret: this.env.JWT_ACCESS_SECRET,
      // cast: env validation guarantees a valid ms-style duration string
      expiresIn: this.env.JWT_ACCESS_TTL as unknown as number,
    });
    return { token, expiresAt };
  }

  async issueRefreshToken(args: {
    userId: string;
    familyId?: string;
    replacedById?: string | null;
    context?: RefreshTokenContext;
  }): Promise<{ token: string; expiresAt: Date; id: string; familyId: string }> {
    const familyId = args.familyId ?? randomUUID();
    const raw = randomBytes(48).toString("base64url");
    const expiresAt = new Date(Date.now() + this.ttlToMs(this.env.JWT_REFRESH_TTL));
    const inserted = await this.db
      .insertInto("refresh_tokens")
      .values({
        user_id: args.userId,
        token_hash: this.hash(raw),
        family_id: familyId,
        expires_at: expiresAt,
        replaced_by_id: null,
        user_agent: args.context?.userAgent ?? null,
        ip: args.context?.ip ?? null,
      })
      .returning(["id"])
      .executeTakeFirstOrThrow();
    return { token: raw, expiresAt, id: inserted.id, familyId };
  }

  async issueTokenPair(
    user: { id: string; email: string; role: Role },
    context?: RefreshTokenContext,
  ): Promise<TokenPair> {
    const access = this.signAccessToken(user);
    const refresh = await this.issueRefreshToken({ userId: user.id, context });
    return {
      accessToken: access.token,
      refreshToken: refresh.token,
      accessTokenExpiresAt: access.expiresAt,
      refreshTokenExpiresAt: refresh.expiresAt,
    };
  }

  /**
   * Rotate a refresh token. Returns a new pair on success.
   * If the presented token is already revoked (reuse), revoke the whole family
   * — that signals theft.
   */
  async rotateRefreshToken(
    presentedToken: string,
    context?: RefreshTokenContext,
  ): Promise<TokenPair> {
    const tokenHash = this.hash(presentedToken);

    // Serialize concurrent rotations of the same token:
    // SELECT ... FOR UPDATE inside a transaction makes parallel requests
    // queue on the row lock. The loser sees `revoked_at` set and gets the
    // reuse-detection path instead of silently issuing a second pair.
    return this.db.transaction().execute(async (tx) => {
      const row = await tx
        .selectFrom("refresh_tokens")
        .innerJoin("users", "users.id", "refresh_tokens.user_id")
        .select([
          "refresh_tokens.id as rt_id",
          "refresh_tokens.family_id",
          "refresh_tokens.expires_at",
          "refresh_tokens.revoked_at",
          "refresh_tokens.user_id",
          "users.email",
          "users.role",
        ])
        .where("refresh_tokens.token_hash", "=", tokenHash)
        .forUpdate()
        .executeTakeFirst();

      if (!row) throw new UnauthorizedException("Invalid refresh token");

      if (row.revoked_at) {
        await tx
          .updateTable("refresh_tokens")
          .set({ revoked_at: new Date() })
          .where("family_id", "=", row.family_id)
          .where("revoked_at", "is", null)
          .execute();
        throw new UnauthorizedException("Refresh token reuse detected — session revoked");
      }

      if (new Date(row.expires_at).getTime() < Date.now()) {
        throw new UnauthorizedException("Refresh token expired");
      }

      const raw = randomBytes(48).toString("base64url");
      const newExpiresAt = new Date(Date.now() + this.ttlToMs(this.env.JWT_REFRESH_TTL));
      const inserted = await tx
        .insertInto("refresh_tokens")
        .values({
          user_id: row.user_id,
          token_hash: this.hash(raw),
          family_id: row.family_id,
          expires_at: newExpiresAt,
          replaced_by_id: null,
          user_agent: context?.userAgent ?? null,
          ip: context?.ip ?? null,
        })
        .returning(["id"])
        .executeTakeFirstOrThrow();

      await tx
        .updateTable("refresh_tokens")
        .set({
          revoked_at: new Date(),
          replaced_by_id: inserted.id,
        })
        .where("id", "=", row.rt_id)
        .execute();

      const access = this.signAccessToken({
        id: row.user_id,
        email: row.email,
        role: row.role,
      });

      return {
        accessToken: access.token,
        refreshToken: raw,
        accessTokenExpiresAt: access.expiresAt,
        refreshTokenExpiresAt: newExpiresAt,
      };
    });
  }

  async revokeRefreshToken(presentedToken: string): Promise<void> {
    await this.db
      .updateTable("refresh_tokens")
      .set({ revoked_at: new Date() })
      .where("token_hash", "=", this.hash(presentedToken))
      .where("revoked_at", "is", null)
      .execute();
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .updateTable("refresh_tokens")
      .set({ revoked_at: new Date() })
      .where("user_id", "=", userId)
      .where("revoked_at", "is", null)
      .execute();
  }

  // Single-use token helpers (email verification, password reset)
  generateSingleUseToken(): { token: string; hash: string } {
    const token = randomBytes(32).toString("base64url");
    return { token, hash: this.hash(token) };
  }

  hashSingleUseToken(token: string): string {
    return this.hash(token);
  }
}
