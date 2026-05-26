import {
  Body, Controller, Delete, Get, HttpCode, Inject, Injectable,
  Module, NotFoundException, Param, Post, Put,
} from "@nestjs/common";
import {
  IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, Min,
} from "class-validator";
import { DATABASE } from "../../database/database.module";
import type { AppDb } from "../../database/db";
import type { BookStatus } from "../../database/types";
import { Roles } from "../../common/decorators/roles.decorator";

const BOOK_STATUSES: readonly BookStatus[] = ["done", "reading", "queued"] as const;

export class CreateBookDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsString() @IsNotEmpty() author!: string;
  @IsEnum(BOOK_STATUSES as readonly string[]) status!: BookStatus;
  @IsInt() @Min(0) @Max(100) pct!: number;
  @IsOptional() @IsUrl() coverImageUrl?: string;
  @IsOptional() @IsUrl() buyUrl?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
export class UpdateBookDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() author?: string;
  @IsOptional() @IsEnum(BOOK_STATUSES as readonly string[]) status?: BookStatus;
  @IsOptional() @IsInt() @Min(0) @Max(100) pct?: number;
  @IsOptional() @IsUrl() coverImageUrl?: string;
  @IsOptional() @IsUrl() buyUrl?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

@Injectable()
export class BooksService {
  constructor(@Inject(DATABASE) private readonly db: AppDb) {}

  list() {
    return this.db.selectFrom("books").selectAll().orderBy("sort_order").orderBy("created_at").execute();
  }
  create(dto: CreateBookDto) {
    return this.db.insertInto("books").values({
      title: dto.title, author: dto.author, status: dto.status, pct: dto.pct,
      cover_image_url: dto.coverImageUrl ?? null,
      buy_url: dto.buyUrl ?? null,
      sort_order: dto.sortOrder ?? 0,
    }).returningAll().executeTakeFirstOrThrow();
  }
  async update(id: string, dto: UpdateBookDto) {
    const existing = await this.db.selectFrom("books").selectAll().where("id", "=", id).executeTakeFirst();
    if (!existing) throw new NotFoundException();

    const u: Record<string, unknown> = {};
    if (dto.title !== undefined) u.title = dto.title;
    if (dto.author !== undefined) u.author = dto.author;
    if (dto.status !== undefined) u.status = dto.status;
    if (dto.pct !== undefined) u.pct = dto.pct;
    if (dto.coverImageUrl !== undefined) u.cover_image_url = dto.coverImageUrl;
    if (dto.buyUrl !== undefined) u.buy_url = dto.buyUrl;
    if (dto.sortOrder !== undefined) u.sort_order = dto.sortOrder;
    if (Object.keys(u).length === 0) return existing;

    const row = await this.db.updateTable("books").set(u).where("id", "=", id).returningAll().executeTakeFirstOrThrow();
    return row;
  }
  async remove(id: string) {
    const r = await this.db.deleteFrom("books").where("id", "=", id).executeTakeFirst();
    if (r.numDeletedRows === 0n) throw new NotFoundException();
  }
}

@Controller("admin/portfolio/books")
@Roles("OWNER")
export class BooksAdminController {
  constructor(private readonly svc: BooksService) {}
  @Get() list() { return this.svc.list(); }
  @Post() create(@Body() dto: CreateBookDto) { return this.svc.create(dto); }
  @Put(":id") update(@Param("id") id: string, @Body() dto: UpdateBookDto) { return this.svc.update(id, dto); }
  @Delete(":id") @HttpCode(204) async remove(@Param("id") id: string) { await this.svc.remove(id); }
}

@Module({
  controllers: [BooksAdminController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}
