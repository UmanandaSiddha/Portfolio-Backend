import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import { DATABASE } from "../database/database.module";
import type { AppDb } from "../database/db";
import { Env } from "../config/env.schema";
import { TokensService, TokenPair, RefreshTokenContext } from "./tokens.service";
import { FirebaseService } from "./firebase.service";
import { gravatarUrl } from "./gravatar.util";
import { MailService } from "../mail/mail.service";
import {
  resetPasswordTemplate,
  verifyEmailTemplate,
} from "../mail/templates";
import type { Role } from "../common/decorators/roles.decorator";
import type {
  ForgotPasswordDto,
  GoogleAuthDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from "./dto/auth.dto";

type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  emailVerifiedAt: Date | null;
  avatarUrl: string | null;
};

type AuthResult = {
  user: PublicUser;
  tokens: TokenPair;
};

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;   // 24h
const PASSWORD_RESET_TTL_MS    = 60 * 60 * 1000;          // 1h

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DATABASE) private readonly db: AppDb,
    private readonly env: Env,
    private readonly tokens: TokensService,
    private readonly firebase: FirebaseService,
    private readonly mail: MailService,
  ) {}

  private roleForEmail(email: string): Role {
    return email.toLowerCase() === this.env.OWNER_EMAIL.toLowerCase()
      ? "OWNER"
      : "USER";
  }

  private toPublic(row: {
    id: string;
    email: string;
    display_name: string;
    role: Role;
    email_verified_at: Date | string | null;
    avatar_url: string | null;
  }): PublicUser {
    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      role: row.role,
      emailVerifiedAt: row.email_verified_at ? new Date(row.email_verified_at) : null,
      avatarUrl: row.avatar_url,
    };
  }

  async register(dto: RegisterDto, ctx?: RefreshTokenContext): Promise<AuthResult> {
    const existing = await this.db
      .selectFrom("users")
      .select("id")
      .where("email", "=", dto.email)
      .executeTakeFirst();
    if (existing) throw new ConflictException("Email is already registered");

    const passwordHash = await argon2.hash(dto.password);
    const role = this.roleForEmail(dto.email);

    const user = await this.db
      .insertInto("users")
      .values({
        email: dto.email,
        password_hash: passwordHash,
        display_name: dto.displayName,
        role,
        avatar_url: gravatarUrl(dto.email),
      })
      .returning([
        "id",
        "email",
        "display_name",
        "role",
        "email_verified_at",
        "avatar_url",
      ])
      .executeTakeFirstOrThrow();

    await this.db
      .insertInto("auth_providers")
      .values({
        user_id: user.id,
        provider: "PASSWORD",
        provider_user_id: null,
      })
      .onConflict((oc) => oc.columns(["user_id", "provider"]).doNothing())
      .execute();

    await this.sendVerifyEmail(user.id, dto.email, dto.displayName);

    const tokens = await this.tokens.issueTokenPair(
      { id: user.id, email: user.email, role: user.role },
      ctx,
    );
    return { user: this.toPublic(user), tokens };
  }

  async login(dto: LoginDto, ctx?: RefreshTokenContext): Promise<AuthResult> {
    const row = await this.db
      .selectFrom("users")
      .select([
        "id",
        "email",
        "password_hash",
        "display_name",
        "role",
        "email_verified_at",
        "avatar_url",
      ])
      .where("email", "=", dto.email)
      .executeTakeFirst();
    if (!row || !row.password_hash) {
      throw new UnauthorizedException("Invalid email or password");
    }
    const ok = await argon2.verify(row.password_hash, dto.password);
    if (!ok) throw new UnauthorizedException("Invalid email or password");

    // Re-assert OWNER role idempotently (in case OWNER_EMAIL changed)
    const desiredRole = this.roleForEmail(row.email);
    if (desiredRole !== row.role) {
      await this.db
        .updateTable("users")
        .set({ role: desiredRole })
        .where("id", "=", row.id)
        .execute();
      row.role = desiredRole;
    }

    // Backfill missing avatar for accounts created before the gravatar default.
    if (!row.avatar_url) {
      const g = gravatarUrl(row.email);
      await this.db
        .updateTable("users")
        .set({ avatar_url: g })
        .where("id", "=", row.id)
        .execute();
      row.avatar_url = g;
    }

    const tokens = await this.tokens.issueTokenPair(
      { id: row.id, email: row.email, role: row.role },
      ctx,
    );
    return { user: this.toPublic(row), tokens };
  }

  async refresh(refreshToken: string, ctx?: RefreshTokenContext): Promise<TokenPair> {
    return this.tokens.rotateRefreshToken(refreshToken, ctx);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revokeRefreshToken(refreshToken);
  }

  async google(dto: GoogleAuthDto, ctx?: RefreshTokenContext): Promise<AuthResult> {
    const decoded = await this.firebase.verifyGoogleIdToken(dto.idToken);
    const email = decoded.email;
    if (!email) {
      throw new UnauthorizedException("Google account has no email");
    }
    const uid = decoded.uid;
    const displayName =
      (decoded.name as string | undefined) ?? email.split("@")[0];
    // Prefer Google's profile photo; fall back to a gravatar identicon so
    // every account has *some* avatar URL.
    const avatarUrl =
      (decoded.picture as string | undefined) ?? gravatarUrl(email);
    const role = this.roleForEmail(email);

    // Try to find by linked google provider first
    const byProvider = await this.db
      .selectFrom("auth_providers")
      .innerJoin("users", "users.id", "auth_providers.user_id")
      .select([
        "users.id",
        "users.email",
        "users.display_name",
        "users.role",
        "users.email_verified_at",
        "users.avatar_url",
      ])
      .where("auth_providers.provider", "=", "GOOGLE")
      .where("auth_providers.provider_user_id", "=", uid)
      .executeTakeFirst();

    let user: typeof byProvider | undefined = byProvider;

    if (!user) {
      // Try to find by email (link new provider)
      const byEmail = await this.db
        .selectFrom("users")
        .select([
          "id",
          "email",
          "display_name",
          "role",
          "email_verified_at",
          "avatar_url",
        ])
        .where("email", "=", email)
        .executeTakeFirst();
      if (byEmail) {
        user = byEmail;
        await this.db
          .insertInto("auth_providers")
          .values({
            user_id: byEmail.id,
            provider: "GOOGLE",
            provider_user_id: uid,
          })
          .onConflict((oc) =>
            oc.columns(["provider", "provider_user_id"]).doNothing(),
          )
          .execute();
        if (!byEmail.email_verified_at && decoded.email_verified) {
          await this.db
            .updateTable("users")
            .set({ email_verified_at: new Date() })
            .where("id", "=", byEmail.id)
            .execute();
          byEmail.email_verified_at = new Date();
        }
      }
    }

    if (!user) {
      // Create new user from Google profile
      const inserted = await this.db
        .insertInto("users")
        .values({
          email,
          password_hash: null,
          display_name: displayName,
          role,
          avatar_url: avatarUrl,
          email_verified_at: decoded.email_verified ? new Date() : null,
        })
        .returning([
          "id",
          "email",
          "display_name",
          "role",
          "email_verified_at",
          "avatar_url",
        ])
        .executeTakeFirstOrThrow();
      user = inserted;
      await this.db
        .insertInto("auth_providers")
        .values({
          user_id: inserted.id,
          provider: "GOOGLE",
          provider_user_id: uid,
        })
        .execute();
    }

    if (user.role !== role) {
      await this.db
        .updateTable("users")
        .set({ role })
        .where("id", "=", user.id)
        .execute();
      user.role = role;
    }

    const tokens = await this.tokens.issueTokenPair(
      { id: user.id, email: user.email, role: user.role },
      ctx,
    );
    return { user: this.toPublic(user), tokens };
  }

  // --- Email verification flow ---

  private async sendVerifyEmail(userId: string, email: string, name: string) {
    const { token, hash } = this.tokens.generateSingleUseToken();
    await this.db
      .insertInto("email_verifications")
      .values({
        user_id: userId,
        token_hash: hash,
        expires_at: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      })
      .execute();
    const link = `${this.env.PUBLIC_BASE_URL}/auth/verify-email?token=${token}`;
    const msg = verifyEmailTemplate({ name, link });
    try {
      await this.mail.send({ to: email, ...msg });
    } catch (err) {
      this.logger.error(`Verify email send failed: ${(err as Error).message}`);
    }
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const hash = this.tokens.hashSingleUseToken(dto.token);
    const row = await this.db
      .selectFrom("email_verifications")
      .select(["id", "user_id", "expires_at", "used_at"])
      .where("token_hash", "=", hash)
      .executeTakeFirst();
    if (!row || row.used_at) throw new BadRequestException("Invalid token");
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new BadRequestException("Token expired");
    }
    await this.db.transaction().execute(async (tx) => {
      await tx
        .updateTable("email_verifications")
        .set({ used_at: new Date() })
        .where("id", "=", row.id)
        .execute();
      await tx
        .updateTable("users")
        .set({ email_verified_at: new Date() })
        .where("id", "=", row.user_id)
        .execute();
    });
  }

  // --- Password reset flow ---

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.db
      .selectFrom("users")
      .select(["id", "display_name", "email"])
      .where("email", "=", dto.email)
      .executeTakeFirst();
    // Always pretend success — don't leak whether email exists
    if (!user) return;

    const { token, hash } = this.tokens.generateSingleUseToken();
    await this.db
      .insertInto("password_resets")
      .values({
        user_id: user.id,
        token_hash: hash,
        expires_at: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      })
      .execute();
    const link = `${this.env.PUBLIC_BASE_URL}/auth/reset-password?token=${token}`;
    const msg = resetPasswordTemplate({ name: user.display_name, link });
    try {
      await this.mail.send({ to: user.email, ...msg });
    } catch (err) {
      this.logger.error(`Reset password send failed: ${(err as Error).message}`);
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const hash = this.tokens.hashSingleUseToken(dto.token);
    const row = await this.db
      .selectFrom("password_resets")
      .select(["id", "user_id", "expires_at", "used_at"])
      .where("token_hash", "=", hash)
      .executeTakeFirst();
    if (!row || row.used_at) throw new BadRequestException("Invalid token");
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new BadRequestException("Token expired");
    }
    const newHash = await argon2.hash(dto.password);
    await this.db.transaction().execute(async (tx) => {
      await tx
        .updateTable("password_resets")
        .set({ used_at: new Date() })
        .where("id", "=", row.id)
        .execute();
      await tx
        .updateTable("users")
        .set({ password_hash: newHash })
        .where("id", "=", row.user_id)
        .execute();
      // Invalidate all refresh tokens — force re-login on every device
      await tx
        .updateTable("refresh_tokens")
        .set({ revoked_at: new Date() })
        .where("user_id", "=", row.user_id)
        .where("revoked_at", "is", null)
        .execute();
    });
  }

  async getMe(userId: string): Promise<PublicUser> {
    const row = await this.db
      .selectFrom("users")
      .select([
        "id",
        "email",
        "display_name",
        "role",
        "email_verified_at",
        "avatar_url",
      ])
      .where("id", "=", userId)
      .executeTakeFirst();
    if (!row) throw new NotFoundException("User not found");
    return this.toPublic(row);
  }
}
