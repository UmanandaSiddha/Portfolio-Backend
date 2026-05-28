import type { CookieOptions, Response } from "express";
import { Env } from "../config/env.schema";
import type { TokenPair } from "./tokens.service";

export const ACCESS_COOKIE = "pa_access";
export const REFRESH_COOKIE = "pa_refresh";

function baseOpts(env: Env): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function setAuthCookies(res: Response, env: Env, tokens: TokenPair) {
  const access: CookieOptions = {
    ...baseOpts(env),
    expires: new Date(tokens.accessTokenExpiresAt),
  };
  const refresh: CookieOptions = {
    ...baseOpts(env),
    expires: new Date(tokens.refreshTokenExpiresAt),
  };
  res.cookie(ACCESS_COOKIE, tokens.accessToken, access);
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, refresh);
}

export function clearAuthCookies(res: Response, env: Env) {
  // clearCookie must receive matching attributes (domain / path / sameSite /
  // secure) for the browser to actually expire the cookie.
  const opts = baseOpts(env);
  res.clearCookie(ACCESS_COOKIE, opts);
  res.clearCookie(REFRESH_COOKIE, opts);
}
