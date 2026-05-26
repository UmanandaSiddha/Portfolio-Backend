import {
  Body, Controller, Get, HttpCode, Inject, Injectable, Module,
  NotFoundException, Param, Patch, Post, Query,
} from "@nestjs/common";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { DATABASE } from "../database/database.module";
import type { AppDb } from "../database/db";
import type { SuggestionKind, SuggestionStatus } from "../database/types";
import { CurrentUser, CurrentUserPayload } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";

const KINDS: readonly SuggestionKind[] = ["topic", "fix", "other"];
const STATUSES: readonly SuggestionStatus[] = ["new", "read", "archived"];

export class CreateSuggestionDto {
  @IsString() @IsNotEmpty() @MaxLength(4000) body!: string;
  @IsOptional() @IsEnum(KINDS as readonly string[]) kind?: SuggestionKind;
}
export class UpdateStatusDto {
  @IsEnum(STATUSES as readonly string[]) status!: SuggestionStatus;
}

@Injectable()
export class SuggestionsService {
  constructor(@Inject(DATABASE) private readonly db: AppDb) {}

  create(userId: string, dto: CreateSuggestionDto) {
    return this.db.insertInto("suggestions").values({
      user_id: userId, body: dto.body, kind: dto.kind ?? "other",
    }).returningAll().executeTakeFirstOrThrow();
  }

  listAdmin(status?: SuggestionStatus) {
    let q = this.db.selectFrom("suggestions as s")
      .innerJoin("users as u", "u.id", "s.user_id")
      .select(["s.id", "s.body", "s.kind", "s.status", "s.created_at",
               "u.id as user_id", "u.email", "u.display_name"])
      .orderBy("s.created_at", "desc");
    if (status) q = q.where("s.status", "=", status);
    return q.execute();
  }

  async updateStatus(id: string, dto: UpdateStatusDto) {
    const r = await this.db.updateTable("suggestions").set({ status: dto.status })
      .where("id", "=", id).returningAll().executeTakeFirst();
    if (!r) throw new NotFoundException();
    return r;
  }
}

@Controller("suggestions")
export class SuggestionsController {
  constructor(private readonly svc: SuggestionsService) {}

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateSuggestionDto, @CurrentUser() user: CurrentUserPayload) {
    return this.svc.create(user.id, dto);
  }

  @Roles("OWNER")
  @Get()
  list(@Query("status") status?: SuggestionStatus) {
    return this.svc.listAdmin(status);
  }

  @Roles("OWNER")
  @Patch(":id")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateStatusDto) {
    return this.svc.updateStatus(id, dto);
  }
}

@Module({
  controllers: [SuggestionsController],
  providers: [SuggestionsService],
  exports: [SuggestionsService],
})
export class SuggestionsModule {}
