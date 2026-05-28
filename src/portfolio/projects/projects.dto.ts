import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class ProjectMetricDto {
  @IsString() @IsNotEmpty() k!: string;
  @IsString() @IsNotEmpty() v!: string;
}

export class ProjectLinkDto {
  @IsString() @IsNotEmpty() label!: string;
  @IsString() @IsNotEmpty() url!: string;
}

export class CreateProjectDto {
  @IsString() @IsNotEmpty() slug!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() sub!: string;
  @IsString() @IsNotEmpty() summary!: string;
  @IsArray() @IsString({ each: true }) tags!: string[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => ProjectMetricDto)
  metrics!: ProjectMetricDto[];
  @IsArray() @IsString({ each: true }) bullets!: string[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProjectLinkDto)
  links?: ProjectLinkDto[];
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

export class UpdateProjectDto {
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() sub?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProjectMetricDto)
  metrics?: ProjectMetricDto[];
  @IsOptional() @IsArray() @IsString({ each: true }) bullets?: string[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProjectLinkDto)
  links?: ProjectLinkDto[];
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
