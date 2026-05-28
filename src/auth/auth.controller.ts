import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";
import { AUTH_THROTTLE } from "../common/throttler.config";
import { Env } from "../config/env.schema";
import { AuthService } from "./auth.service";
import {
  ForgotPasswordDto,
  GoogleAuthDto,
  LoginDto,
  LogoutDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from "./dto/auth.dto";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, CurrentUserPayload } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  setAuthCookies,
} from "./cookies.util";

function ctxFromReq(req: Request) {
  return {
    userAgent: req.headers["user-agent"] ?? null,
    ip: (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() || req.ip || null,
  };
}

function refreshTokenFromReq(req: Request, bodyToken?: string): string | null {
  const fromCookie = (req.cookies?.[REFRESH_COOKIE] as string | undefined) ?? null;
  return fromCookie || bodyToken || null;
}

@Controller("auth")
@Throttle(AUTH_THROTTLE)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly env: Env,
  ) {}

  @Public()
  @Post("register")
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register(dto, ctxFromReq(req));
    setAuthCookies(res, this.env, result.tokens);
    return result;
  }

  @Public()
  @Post("login")
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto, ctxFromReq(req));
    setAuthCookies(res, this.env, result.tokens);
    return result;
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = refreshTokenFromReq(req, dto?.refreshToken);
    if (!refreshToken) {
      throw new UnauthorizedException("Missing refresh token");
    }
    const tokens = await this.auth.refresh(refreshToken, ctxFromReq(req));
    setAuthCookies(res, this.env, tokens);
    return { tokens };
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(204)
  async logout(
    @Body() dto: LogoutDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = refreshTokenFromReq(req, dto?.refreshToken);
    if (refreshToken) {
      try {
        await this.auth.logout(refreshToken);
      } catch {
        /* still clear cookies even if revoke fails — local sign-out wins */
      }
    }
    clearAuthCookies(res, this.env);
  }

  @Public()
  @Post("google")
  @HttpCode(200)
  async google(
    @Body() dto: GoogleAuthDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.google(dto, ctxFromReq(req));
    setAuthCookies(res, this.env, result.tokens);
    return result;
  }

  @Public()
  @Post("verify-email")
  @HttpCode(204)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.auth.verifyEmail(dto);
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(204)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.auth.forgotPassword(dto);
  }

  @Public()
  @Post("reset-password")
  @HttpCode(204)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: CurrentUserPayload) {
    return this.auth.getMe(user.id);
  }
}
