import { Type } from "class-transformer";
import {
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from "class-validator";

export class UpdateSiteIdentityDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() role!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() github?: string;
  @IsOptional() @IsString() linkedin?: string;
  @IsOptional() @IsString() siteUrl?: string;
  @IsOptional() @IsUrl() avatarUrl?: string;
}

export class UpdateSiteStatusDto {
  @IsString() @IsNotEmpty() available!: string;
  @IsOptional() @IsString() currentlyAt?: string;
}

class HeroCurrentCardDto {
  @IsString() label!: string;
  @IsString() body!: string;
  @IsOptional() @IsString() badge?: string;
}

export class UpdateHeroDto {
  @IsString() @IsNotEmpty() eyebrow!: string;
  @IsArray() @IsString({ each: true }) headline!: string[];
  @IsString() @IsNotEmpty() lede!: string;
  @ValidateNested() @Type(() => HeroCurrentCardDto)
  currentCard!: HeroCurrentCardDto;
  @IsArray() @IsString({ each: true }) stackPills!: string[];
}

export class UpdateAboutDto {
  @IsArray() @IsString({ each: true }) prose!: string[];
  @IsOptional() @IsString() footnote?: string;
}

// Side facts

export class CreateSideFactDto {
  @IsString() @IsNotEmpty() k!: string;
  @IsString() @IsNotEmpty() v!: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class UpdateSideFactDto {
  @IsOptional() @IsString() k?: string;
  @IsOptional() @IsString() v?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
