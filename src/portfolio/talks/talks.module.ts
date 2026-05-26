import {
  Body, Controller, Delete, Get, HttpCode, Inject, Injectable,
  Module, NotFoundException, Param, Post, Put,
} from "@nestjs/common";
import { IsInt, IsNotEmpty, IsOptional, IsString, Min, IsUrl } from "class-validator";
import { DATABASE } from "../../database/database.module";
import type { AppDb } from "../../database/db";
import { Roles } from "../../common/decorators/roles.decorator";

export class CreateTalkDto {
  @IsString() @IsNotEmpty() whenLabel!: string;
  @IsString() @IsNotEmpty() title!: string;
  @IsString() @IsNotEmpty() whereLabel!: string;
  @IsOptional() @IsUrl() slidesUrl?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
export class UpdateTalkDto {
  @IsOptional() @IsString() whenLabel?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() whereLabel?: string;
  @IsOptional() @IsUrl() slidesUrl?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

@Injectable()
export class TalksService {
  constructor(@Inject(DATABASE) private readonly db: AppDb) {}
  list() {
    return this.db.selectFrom("talks").selectAll().orderBy("sort_order").orderBy("created_at").execute();
  }
  create(dto: CreateTalkDto) {
    return this.db.insertInto("talks").values({
      when_label: dto.whenLabel, title: dto.title, where_label: dto.whereLabel,
      slides_url: dto.slidesUrl ?? null, sort_order: dto.sortOrder ?? 0,
    }).returningAll().executeTakeFirstOrThrow();
  }
  async update(id: string, dto: UpdateTalkDto) {
    const u: Record<string, unknown> = {};
    if (dto.whenLabel !== undefined) u.when_label = dto.whenLabel;
    if (dto.title !== undefined) u.title = dto.title;
    if (dto.whereLabel !== undefined) u.where_label = dto.whereLabel;
    if (dto.slidesUrl !== undefined) u.slides_url = dto.slidesUrl;
    if (dto.sortOrder !== undefined) u.sort_order = dto.sortOrder;
    if (Object.keys(u).length === 0) {
      const e = await this.db.selectFrom("talks").selectAll().where("id", "=", id).executeTakeFirst();
      if (!e) throw new NotFoundException();
      return e;
    }
    const row = await this.db.updateTable("talks").set(u).where("id", "=", id).returningAll().executeTakeFirst();
    if (!row) throw new NotFoundException();
    return row;
  }
  async remove(id: string) {
    const r = await this.db.deleteFrom("talks").where("id", "=", id).executeTakeFirst();
    if (r.numDeletedRows === 0n) throw new NotFoundException();
  }
}

@Controller("admin/portfolio/talks")
@Roles("OWNER")
export class TalksAdminController {
  constructor(private readonly svc: TalksService) {}
  @Get() list() { return this.svc.list(); }
  @Post() create(@Body() dto: CreateTalkDto) { return this.svc.create(dto); }
  @Put(":id") update(@Param("id") id: string, @Body() dto: UpdateTalkDto) { return this.svc.update(id, dto); }
  @Delete(":id") @HttpCode(204) async remove(@Param("id") id: string) { await this.svc.remove(id); }
}

@Module({
  controllers: [TalksAdminController],
  providers: [TalksService],
  exports: [TalksService],
})
export class TalksModule {}
