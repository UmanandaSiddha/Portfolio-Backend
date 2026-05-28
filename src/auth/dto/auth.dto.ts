import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  displayName!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class RefreshDto {
  // Optional in the body — the cookie is the primary source. Body fallback
  // is kept for backwards compatibility with any non-cookie client.
  @IsOptional()
  @IsString()
  @MinLength(1)
  refreshToken?: string;
}

export class LogoutDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  refreshToken?: string;
}

export class VerifyEmailDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}
