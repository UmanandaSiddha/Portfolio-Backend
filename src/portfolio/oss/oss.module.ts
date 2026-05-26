import {
  Body, Controller, Delete, Get, HttpCode, Inject, Injectable,
  Module, NotFoundException, Param, Post, Put,
} from "@nestjs/common";
import {
  IsInt, IsNotEmpty, IsOptional, IsString, Min,
} from "class-validator";
import { DATABASE } from "../../database/database.module";
import type { AppDb } from "../../database/db";
import { Roles } from "../../common/decorators/roles.decorator";

export class CreateOssRepoDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsNotEmpty() repo!: string;
  @IsString() @IsNotEmpty() description!: string;
  @IsString() @IsNotEmpty() lang!: string;
  @IsOptional() @IsInt() @Min(0) stars?: number;
  @IsString() @IsNotEmpty() updatedLabel!: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
export class UpdateOssRepoDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() repo?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() lang?: string;
  @IsOptional() @IsInt() @Min(0) stars?: number;
  @IsOptional() @IsString() updatedLabel?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

@Injectable()
export class OssService {
  constructor(@Inject(DATABASE) private readonly db: AppDb) {}

  list() {
    return this.db.selectFrom("oss_repos").selectAll().orderBy("sort_order").orderBy("created_at").execute();
  }
  create(dto: CreateOssRepoDto) {
    return this.db
      .insertInto("oss_repos")
      .values({
        name: dto.name, repo: dto.repo, description: dto.description,
        lang: dto.lang, stars: dto.stars ?? 0, updated_label: dto.updatedLabel,
        sort_order: dto.sortOrder ?? 0,
      })
      .returningAll().executeTakeFirstOrThrow();
  }
  async update(id: string, dto: UpdateOssRepoDto) {
    const u: Record<string, unknown> = {};
    if (dto.name !== undefined) u.name = dto.name;
    if (dto.repo !== undefined) u.repo = dto.repo;
    if (dto.description !== undefined) u.description = dto.description;
    if (dto.lang !== undefined) u.lang = dto.lang;
    if (dto.stars !== undefined) u.stars = dto.stars;
    if (dto.updatedLabel !== undefined) u.updated_label = dto.updatedLabel;
    if (dto.sortOrder !== undefined) u.sort_order = dto.sortOrder;
    if (Object.keys(u).length === 0) {
      const existing = await this.db.selectFrom("oss_repos").selectAll().where("id", "=", id).executeTakeFirst();
      if (!existing) throw new NotFoundException();
      return existing;
    }
    const row = await this.db.updateTable("oss_repos").set(u).where("id", "=", id).returningAll().executeTakeFirst();
    if (!row) throw new NotFoundException();
    return row;
  }
  async remove(id: string) {
    const r = await this.db.deleteFrom("oss_repos").where("id", "=", id).executeTakeFirst();
    if (r.numDeletedRows === 0n) throw new NotFoundException();
  }
}

@Controller("admin/portfolio/oss")
@Roles("OWNER")
export class OssAdminController {
  constructor(private readonly svc: OssService) {}
  @Get() list() { return this.svc.list(); }
  @Post() create(@Body() dto: CreateOssRepoDto) { return this.svc.create(dto); }
  @Put(":id") update(@Param("id") id: string, @Body() dto: UpdateOssRepoDto) { return this.svc.update(id, dto); }
  @Delete(":id") @HttpCode(204) async remove(@Param("id") id: string) { await this.svc.remove(id); }
}

@Module({
  controllers: [OssAdminController],
  providers: [OssService],
  exports: [OssService],
})
export class OssModule {}
