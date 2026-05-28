import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { createHash } from "node:crypto";
import { IsEnum, IsOptional } from "class-validator";
import { PostsService } from "./posts.service";
import type { PostKind } from "../database/types";
import { Public } from "../common/decorators/public.decorator";
import { OptionalJwtAuthGuard } from "../common/guards/optional-jwt-auth.guard";
import { CurrentUser, CurrentUserPayload } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";

export class ReactionDto {
  @IsOptional() @IsEnum(["like", "dislike"]) type?: "like" | "dislike" | null;
}

const KINDS: readonly PostKind[] = ["blog", "diary"];

@Controller("posts")
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Public()
  @Get()
  list(@Query("kind") kind?: string) {
    const k = (kind ?? "blog") as PostKind;
    if (!KINDS.includes(k)) throw new BadRequestException("Invalid kind");
    return this.posts.list(k);
  }

  @Roles("OWNER")
  @Get("admin/all")
  adminList() {
    return this.posts.adminList();
  }

  @Public()
  @Get(":kind/:slug")
  get(@Param("kind") kind: PostKind, @Param("slug") slug: string) {
    if (!KINDS.includes(kind)) throw new BadRequestException("Invalid kind");
    return this.posts.getBySlug(kind, slug);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post(":kind/:slug/views")
  @HttpCode(204)
  async view(
    @Param("kind") kind: PostKind,
    @Param("slug") slug: string,
    @Req() req: Request,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    if (!KINDS.includes(kind)) throw new BadRequestException("Invalid kind");
    const ip =
      (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() ||
      req.ip ||
      "unknown";
    const ua = req.headers["user-agent"] ?? "unknown";
    const dailySalt = new Date().toISOString().slice(0, 10);
    const viewerHash = createHash("sha256").update(`${ip}::${ua}::${dailySalt}`).digest("hex");
    await this.posts.recordView({
      kind,
      slug,
      viewerHash,
      userId: user?.id ?? null,
      sessionId: null,
    });
  }

  @Post(":kind/:slug/reactions")
  @HttpCode(204)
  async react(
    @Param("kind") kind: PostKind,
    @Param("slug") slug: string,
    @Body() dto: ReactionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (!KINDS.includes(kind)) throw new BadRequestException("Invalid kind");
    await this.posts.setReaction({
      kind,
      slug,
      userId: user.id,
      type: dto.type ?? null,
    });
  }

  @Roles("OWNER")
  @Post(":kind/:slug/blast")
  async blast(@Param("kind") kind: PostKind, @Param("slug") slug: string) {
    if (!KINDS.includes(kind)) throw new BadRequestException("Invalid kind");
    return this.posts.blast(kind, slug);
  }

  @Roles("OWNER")
  @Post("admin/sync")
  syncFromSanity() {
    return this.posts.syncFromSanity();
  }
}
