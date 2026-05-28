import {
  Body, Controller, Delete, Get, HttpCode, Inject, Injectable,
  Module, NotFoundException, Param, Post, Put,
} from "@nestjs/common";
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";
import { DATABASE } from "../../database/database.module";
import type { AppDb } from "../../database/db";
import { Roles } from "../../common/decorators/roles.decorator";

export class CreateExperienceDto {
  @IsString() @IsNotEmpty() role!: string;
  @IsString() @IsNotEmpty() company!: string;
  @IsOptional() @IsString() location?: string;
  @IsString() @IsNotEmpty() period!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) bullets?: string[];
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
export class UpdateExperienceDto {
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() period?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) bullets?: string[];
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

@Injectable()
export class ExperienceService {
  constructor(@Inject(DATABASE) private readonly db: AppDb) {}

  list() {
    return this.db
      .selectFrom("experience")
      .selectAll()
      .orderBy("sort_order")
      .orderBy("created_at")
      .execute();
  }

  create(dto: CreateExperienceDto) {
    return this.db
      .insertInto("experience")
      .values({
        role: dto.role,
        company: dto.company,
        location: dto.location ?? null,
        period: dto.period,
        bullets: dto.bullets ?? [],
        sort_order: dto.sortOrder ?? 0,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async update(id: string, dto: UpdateExperienceDto) {
    const u: Record<string, unknown> = {};
    if (dto.role !== undefined) u.role = dto.role;
    if (dto.company !== undefined) u.company = dto.company;
    if (dto.location !== undefined) u.location = dto.location;
    if (dto.period !== undefined) u.period = dto.period;
    if (dto.bullets !== undefined) u.bullets = dto.bullets;
    if (dto.sortOrder !== undefined) u.sort_order = dto.sortOrder;
    if (Object.keys(u).length === 0) {
      const e = await this.db.selectFrom("experience").selectAll().where("id", "=", id).executeTakeFirst();
      if (!e) throw new NotFoundException();
      return e;
    }
    const row = await this.db.updateTable("experience").set(u).where("id", "=", id).returningAll().executeTakeFirst();
    if (!row) throw new NotFoundException();
    return row;
  }

  async remove(id: string) {
    const r = await this.db.deleteFrom("experience").where("id", "=", id).executeTakeFirst();
    if (r.numDeletedRows === 0n) throw new NotFoundException();
  }
}

@Controller("admin/portfolio/experience")
@Roles("OWNER")
export class ExperienceAdminController {
  constructor(private readonly svc: ExperienceService) {}
  @Get() list() { return this.svc.list(); }
  @Post() create(@Body() dto: CreateExperienceDto) { return this.svc.create(dto); }
  @Put(":id") update(@Param("id") id: string, @Body() dto: UpdateExperienceDto) { return this.svc.update(id, dto); }
  @Delete(":id") @HttpCode(204) async remove(@Param("id") id: string) { await this.svc.remove(id); }
}

@Module({
  controllers: [ExperienceAdminController],
  providers: [ExperienceService],
  exports: [ExperienceService],
})
export class ExperienceModule {}
