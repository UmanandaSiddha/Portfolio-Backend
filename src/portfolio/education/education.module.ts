import {
  Body, Controller, Delete, Get, HttpCode, Inject, Injectable,
  Module, NotFoundException, Param, Post, Put,
} from "@nestjs/common";
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";
import { DATABASE } from "../../database/database.module";
import type { AppDb } from "../../database/db";
import { Roles } from "../../common/decorators/roles.decorator";

export class CreateEducationDto {
  @IsString() @IsNotEmpty() institution!: string;
  @IsString() @IsNotEmpty() degree!: string;
  @IsOptional() @IsString() detail?: string;
  @IsOptional() @IsString() period?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
export class UpdateEducationDto {
  @IsOptional() @IsString() institution?: string;
  @IsOptional() @IsString() degree?: string;
  @IsOptional() @IsString() detail?: string;
  @IsOptional() @IsString() period?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

@Injectable()
export class EducationService {
  constructor(@Inject(DATABASE) private readonly db: AppDb) {}

  list() {
    return this.db
      .selectFrom("education")
      .selectAll()
      .orderBy("sort_order")
      .orderBy("created_at")
      .execute();
  }

  create(dto: CreateEducationDto) {
    return this.db
      .insertInto("education")
      .values({
        institution: dto.institution,
        degree: dto.degree,
        detail: dto.detail ?? null,
        period: dto.period ?? null,
        sort_order: dto.sortOrder ?? 0,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(id: string, dto: UpdateEducationDto) {
    const u: Record<string, unknown> = {};
    if (dto.institution !== undefined) u.institution = dto.institution;
    if (dto.degree !== undefined) u.degree = dto.degree;
    if (dto.detail !== undefined) u.detail = dto.detail;
    if (dto.period !== undefined) u.period = dto.period;
    if (dto.sortOrder !== undefined) u.sort_order = dto.sortOrder;
    if (Object.keys(u).length === 0) {
      const e = await this.db.selectFrom("education").selectAll().where("id", "=", id).executeTakeFirst();
      if (!e) throw new NotFoundException();
      return e;
    }
    const row = await this.db.updateTable("education").set(u).where("id", "=", id).returningAll().executeTakeFirst();
    if (!row) throw new NotFoundException();
    return row;
  }

  async remove(id: string) {
    const r = await this.db.deleteFrom("education").where("id", "=", id).executeTakeFirst();
    if (r.numDeletedRows === 0n) throw new NotFoundException();
  }
}

@Controller("admin/portfolio/education")
@Roles("OWNER")
export class EducationAdminController {
  constructor(private readonly svc: EducationService) {}
  @Get() list() { return this.svc.list(); }
  @Post() create(@Body() dto: CreateEducationDto) { return this.svc.create(dto); }
  @Put(":id") update(@Param("id") id: string, @Body() dto: UpdateEducationDto) { return this.svc.update(id, dto); }
  @Delete(":id") @HttpCode(204) async remove(@Param("id") id: string) { await this.svc.remove(id); }
}

@Module({
  controllers: [EducationAdminController],
  providers: [EducationService],
  exports: [EducationService],
})
export class EducationModule {}
