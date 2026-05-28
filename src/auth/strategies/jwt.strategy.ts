import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { Request } from "express";
import { Env } from "../../config/env.schema";
import { ACCESS_COOKIE } from "../cookies.util";
import type { AccessTokenPayload } from "../tokens.service";
import type { CurrentUserPayload } from "../../common/decorators/current-user.decorator";

// Primary: httpOnly cookie set by /auth/* endpoints.
// Fallback: Authorization: Bearer <token> — for non-browser clients (curl,
// tests, mobile, etc.) that don't carry cookies.
function fromCookie(req: Request): string | null {
  const v = (req?.cookies as Record<string, string | undefined> | undefined)?.[ACCESS_COOKIE];
  return v ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(env: Env) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        fromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: env.JWT_ACCESS_SECRET,
    });
  }

  validate(payload: AccessTokenPayload): CurrentUserPayload {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
