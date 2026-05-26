import {
  Body, Controller, Delete, Get, HttpCode, Inject, Injectable,
  Module, NotFoundException, Param, Post, Put,
} from "@nestjs/common";
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";
import { DATABASE } from "../../database/database.module";
import type { AppDb } from "../../database/db";
import { Roles } from "../../common/decorators/roles.decorator";

export class CreateNowPlayingDto {
  @IsString() @IsNotEmpty() track!: string;
  @IsString() @IsNotEmpty() artist!: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
export class UpdateNowPlayingDto {
  @IsOptional() @IsString() track?: string;
  @IsOptional() @IsString() artist?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

@Injectable()
export class NowPlayingService {
  constructor(@Inject(DATABASE) private readonly db: AppDb) {}
  list() {
    return this.db.selectFrom("now_playing").selectAll().orderBy("sort_order").orderBy("created_at").execute();
  }
  create(dto: CreateNowPlayingDto) {
    return this.db.insertInto("now_playing").values({
      track: dto.track, artist: dto.artist, sort_order: dto.sortOrder ?? 0,
    }).returningAll().executeTakeFirstOrThrow();
  }
  async update(id: string, dto: UpdateNowPlayingDto) {
    const u: Record<string, unknown> = {};
    if (dto.track !== undefined) u.track = dto.track;
    if (dto.artist !== undefined) u.artist = dto.artist;
    if (dto.sortOrder !== undefined) u.sort_order = dto.sortOrder;
    if (Object.keys(u).length === 0) {
      const e = await this.db.selectFrom("now_playing").selectAll().where("id", "=", id).executeTakeFirst();
      if (!e) throw new NotFoundException();
      return e;
    }
    const row = await this.db.updateTable("now_playing").set(u).where("id", "=", id).returningAll().executeTakeFirst();
    if (!row) throw new NotFoundException();
    return row;
  }
  async remove(id: string) {
    const r = await this.db.deleteFrom("now_playing").where("id", "=", id).executeTakeFirst();
    if (r.numDeletedRows === 0n) throw new NotFoundException();
  }
}

@Controller("admin/portfolio/now-playing")
@Roles("OWNER")
export class NowPlayingAdminController {
  constructor(private readonly svc: NowPlayingService) {}
  @Get() list() { return this.svc.list(); }
  @Post() create(@Body() dto: CreateNowPlayingDto) { return this.svc.create(dto); }
  @Put(":id") update(@Param("id") id: string, @Body() dto: UpdateNowPlayingDto) { return this.svc.update(id, dto); }
  @Delete(":id") @HttpCode(204) async remove(@Param("id") id: string) { await this.svc.remove(id); }
}

@Module({
  controllers: [NowPlayingAdminController],
  providers: [NowPlayingService],
  exports: [NowPlayingService],
})
export class NowPlayingModule {}
