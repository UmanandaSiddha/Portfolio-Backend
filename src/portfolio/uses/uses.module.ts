import {
  Body, Controller, Delete, Get, HttpCode, Inject, Injectable,
  Module, NotFoundException, Param, Post, Put,
} from "@nestjs/common";
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { DATABASE } from "../../database/database.module";
import type { AppDb } from "../../database/db";
import { Roles } from "../../common/decorators/roles.decorator";

export class CreateUsesGroupDto {
  @IsString() @IsNotEmpty() key!: string;
  @IsString() @IsNotEmpty() label!: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
export class UpdateUsesGroupDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
export class CreateUsesItemDto {
  @IsUUID() groupId!: string;
  @IsString() @IsNotEmpty() lbl!: string;
  @IsString() @IsNotEmpty() sub!: string;
  @IsString() @IsNotEmpty() val!: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
export class UpdateUsesItemDto {
  @IsOptional() @IsUUID() groupId?: string;
  @IsOptional() @IsString() lbl?: string;
  @IsOptional() @IsString() sub?: string;
  @IsOptional() @IsString() val?: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}

@Injectable()
export class UsesService {
  constructor(@Inject(DATABASE) private readonly db: AppDb) {}

  async listAll() {
    const groups = await this.db.selectFrom("uses_groups").selectAll().orderBy("sort_order").execute();
    const items = await this.db.selectFrom("uses_items").selectAll().orderBy("sort_order").execute();
    return groups.map((g) => ({
      ...g,
      items: items.filter((i) => i.group_id === g.id),
    }));
  }
  createGroup(dto: CreateUsesGroupDto) {
    return this.db.insertInto("uses_groups").values({
      key: dto.key, label: dto.label, sort_order: dto.sortOrder ?? 0,
    }).returningAll().executeTakeFirstOrThrow();
  }
  async updateGroup(id: string, dto: UpdateUsesGroupDto) {
    const u: Record<string, unknown> = {};
    if (dto.label !== undefined) u.label = dto.label;
    if (dto.sortOrder !== undefined) u.sort_order = dto.sortOrder;
    if (Object.keys(u).length === 0) {
      const e = await this.db.selectFrom("uses_groups").selectAll().where("id", "=", id).executeTakeFirst();
      if (!e) throw new NotFoundException();
      return e;
    }
    const row = await this.db.updateTable("uses_groups").set(u).where("id", "=", id).returningAll().executeTakeFirst();
    if (!row) throw new NotFoundException();
    return row;
  }
  async deleteGroup(id: string) {
    const r = await this.db.deleteFrom("uses_groups").where("id", "=", id).executeTakeFirst();
    if (r.numDeletedRows === 0n) throw new NotFoundException();
  }
  createItem(dto: CreateUsesItemDto) {
    return this.db.insertInto("uses_items").values({
      group_id: dto.groupId, lbl: dto.lbl, sub: dto.sub, val: dto.val,
      sort_order: dto.sortOrder ?? 0,
    }).returningAll().executeTakeFirstOrThrow();
  }
  async updateItem(id: string, dto: UpdateUsesItemDto) {
    const u: Record<string, unknown> = {};
    if (dto.groupId !== undefined) u.group_id = dto.groupId;
    if (dto.lbl !== undefined) u.lbl = dto.lbl;
    if (dto.sub !== undefined) u.sub = dto.sub;
    if (dto.val !== undefined) u.val = dto.val;
    if (dto.sortOrder !== undefined) u.sort_order = dto.sortOrder;
    if (Object.keys(u).length === 0) {
      const e = await this.db.selectFrom("uses_items").selectAll().where("id", "=", id).executeTakeFirst();
      if (!e) throw new NotFoundException();
      return e;
    }
    const row = await this.db.updateTable("uses_items").set(u).where("id", "=", id).returningAll().executeTakeFirst();
    if (!row) throw new NotFoundException();
    return row;
  }
  async deleteItem(id: string) {
    const r = await this.db.deleteFrom("uses_items").where("id", "=", id).executeTakeFirst();
    if (r.numDeletedRows === 0n) throw new NotFoundException();
  }
}

@Controller("admin/portfolio/uses")
@Roles("OWNER")
export class UsesAdminController {
  constructor(private readonly svc: UsesService) {}
  @Get() listAll() { return this.svc.listAll(); }
  @Post("groups") createGroup(@Body() dto: CreateUsesGroupDto) { return this.svc.createGroup(dto); }
  @Put("groups/:id") updateGroup(@Param("id") id: string, @Body() dto: UpdateUsesGroupDto) { return this.svc.updateGroup(id, dto); }
  @Delete("groups/:id") @HttpCode(204) async deleteGroup(@Param("id") id: string) { await this.svc.deleteGroup(id); }
  @Post("items") createItem(@Body() dto: CreateUsesItemDto) { return this.svc.createItem(dto); }
  @Put("items/:id") updateItem(@Param("id") id: string, @Body() dto: UpdateUsesItemDto) { return this.svc.updateItem(id, dto); }
  @Delete("items/:id") @HttpCode(204) async deleteItem(@Param("id") id: string) { await this.svc.deleteItem(id); }
}

@Module({
  controllers: [UsesAdminController],
  providers: [UsesService],
  exports: [UsesService],
})
export class UsesModule {}
