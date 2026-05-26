import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { AUTH_THROTTLE } from "../common/throttler.config";
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

function ctxFromReq(req: Request) {
  return {
    userAgent: req.headers["user-agent"] ?? null,
    ip: (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() || req.ip || null,
  };
}

@Controller("auth")
@Throttle(AUTH_THROTTLE)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("register")
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.auth.register(dto, ctxFromReq(req));
  }

  @Public()
  @Post("login")
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, ctxFromReq(req));
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  async refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    const tokens = await this.auth.refresh(dto.refreshToken, ctxFromReq(req));
    return { tokens };
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(204)
  async logout(@Body() dto: LogoutDto) {
    await this.auth.logout(dto.refreshToken);
  }

  @Public()
  @Post("google")
  @HttpCode(200)
  google(@Body() dto: GoogleAuthDto, @Req() req: Request) {
    return this.auth.google(dto, ctxFromReq(req));
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
