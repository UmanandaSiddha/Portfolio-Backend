import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Sse,
  MessageEvent,
} from "@nestjs/common";
import { Observable } from "rxjs";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { CommentsService } from "./comments.service";
import { CommentEventsBus } from "./comments.events";
import type { PostKind } from "../database/types";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser, CurrentUserPayload } from "../common/decorators/current-user.decorator";

export class CreateCommentDto {
  @IsString() @IsNotEmpty() @MaxLength(5000) body!: string;
  @IsOptional() @IsUUID() parentId?: string;
}
export class CommentListQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
}
export class CommentReactionDto {
  @IsOptional() @IsEnum(["like", "dislike"]) type?: "like" | "dislike" | null;
}

const KINDS: readonly PostKind[] = ["blog", "diary"];

@Controller()
export class CommentsController {
  constructor(
    private readonly svc: CommentsService,
    private readonly events: CommentEventsBus,
  ) {}

  @Public()
  @Sse("posts/:kind/:slug/comments/stream")
  stream(@Param("kind") kind: PostKind, @Param("slug") slug: string): Observable<MessageEvent> {
    if (!KINDS.includes(kind)) throw new BadRequestException();
    return this.events.streamForPost(kind, slug);
  }

  @Public()
  @Get("posts/:kind/:slug/comments")
  list(
    @Param("kind") kind: PostKind,
    @Param("slug") slug: string,
    @Query() q: CommentListQuery,
  ) {
    if (!KINDS.includes(kind)) throw new BadRequestException();
    return this.svc.list(kind, slug, q.limit ?? 50, q.offset ?? 0);
  }

  @Post("posts/:kind/:slug/comments")
  create(
    @Param("kind") kind: PostKind,
    @Param("slug") slug: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (!KINDS.includes(kind)) throw new BadRequestException();
    return this.svc.create(kind, slug, user.id, dto.body, dto.parentId);
  }

  @Delete("comments/:id")
  @HttpCode(204)
  async remove(@Param("id") id: string, @CurrentUser() user: CurrentUserPayload) {
    await this.svc.remove(id, user);
  }

  @Post("comments/:id/reactions")
  @HttpCode(204)
  async react(
    @Param("id") id: string,
    @Body() dto: CommentReactionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.svc.reactToComment(id, user.id, dto.type ?? null);
  }
}
