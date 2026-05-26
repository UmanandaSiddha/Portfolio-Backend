import { ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DATABASE } from "../database/database.module";
import type { AppDb } from "../database/db";
import type { PostKind } from "../database/types";
import { CommentEventsBus } from "./comments.events";

function toIso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

export type CommentNode = {
  id: string;
  body: string;
  createdAt: string;
  deletedAt: string | null;
  parentId: string | null;
  author: { id: string; displayName: string; avatarUrl: string | null };
  likes: number;
  dislikes: number;
  replies: CommentNode[];
};

@Injectable()
export class CommentsService {
  constructor(
    @Inject(DATABASE) private readonly db: AppDb,
    private readonly events: CommentEventsBus,
  ) {}

  private async postIdBySlug(kind: PostKind, slug: string) {
    const row = await this.db
      .selectFrom("posts")
      .select(["id"])
      .where("kind", "=", kind)
      .where("slug", "=", slug)
      .where("is_published", "=", true)
      .executeTakeFirst();
    if (!row) throw new NotFoundException();
    return row.id;
  }

  async list(kind: PostKind, slug: string, limit = 50, offset = 0): Promise<CommentNode[]> {
    const postId = await this.postIdBySlug(kind, slug);
    const rows = await this.db
      .selectFrom("comments as c")
      .innerJoin("users as u", "u.id", "c.user_id")
      .select((eb) => [
        "c.id", "c.body", "c.created_at", "c.deleted_at", "c.parent_id",
        "u.id as author_id", "u.display_name", "u.avatar_url",
        eb
          .selectFrom("comment_reactions as r")
          .select(eb.fn.countAll<number>().as("c"))
          .whereRef("r.comment_id", "=", "c.id")
          .where("r.type", "=", "like")
          .as("likes"),
        eb
          .selectFrom("comment_reactions as r")
          .select(eb.fn.countAll<number>().as("c"))
          .whereRef("r.comment_id", "=", "c.id")
          .where("r.type", "=", "dislike")
          .as("dislikes"),
      ])
      .where("c.post_id", "=", postId)
      .orderBy("c.created_at", "desc")
      .limit(limit)
      .offset(offset)
      .execute();

    const byId = new Map<string, CommentNode>();
    const roots: CommentNode[] = [];
    for (const r of rows) {
      const node: CommentNode = {
        id: r.id,
        body: r.deleted_at ? "[deleted]" : r.body,
        createdAt: toIso(r.created_at as unknown as Date | string),
        deletedAt: r.deleted_at ? toIso(r.deleted_at as unknown as Date | string) : null,
        parentId: r.parent_id,
        author: {
          id: r.author_id,
          displayName: r.display_name,
          avatarUrl: r.avatar_url,
        },
        likes: Number(r.likes ?? 0),
        dislikes: Number(r.dislikes ?? 0),
        replies: [],
      };
      byId.set(node.id, node);
    }
    for (const node of byId.values()) {
      if (node.parentId && byId.has(node.parentId)) {
        byId.get(node.parentId)!.replies.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async create(kind: PostKind, slug: string, userId: string, body: string, parentId?: string) {
    const postId = await this.postIdBySlug(kind, slug);
    if (parentId) {
      const parent = await this.db
        .selectFrom("comments")
        .select(["id", "post_id", "parent_id"])
        .where("id", "=", parentId)
        .executeTakeFirst();
      if (!parent || parent.post_id !== postId) throw new NotFoundException("Parent not found");
      if (parent.parent_id) throw new ForbiddenException("Only one level of nesting allowed");
    }
    const row = await this.db
      .insertInto("comments")
      .values({
        post_id: postId,
        user_id: userId,
        parent_id: parentId ?? null,
        body,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const author = await this.db
      .selectFrom("users")
      .select(["id", "display_name", "avatar_url"])
      .where("id", "=", userId)
      .executeTakeFirstOrThrow();

    this.events.emit({
      type: "created",
      postId,
      kind,
      slug,
      comment: {
        id: row.id,
        body: row.body,
        createdAt: toIso(row.created_at as unknown as Date | string),
        parentId: row.parent_id,
        author: {
          id: author.id,
          displayName: author.display_name,
          avatarUrl: author.avatar_url,
        },
      },
    });
    return row;
  }

  async remove(commentId: string, user: { id: string; role: string }) {
    const row = await this.db
      .selectFrom("comments as c")
      .innerJoin("posts as p", "p.id", "c.post_id")
      .select(["c.id", "c.user_id", "p.kind", "p.slug", "c.post_id"])
      .where("c.id", "=", commentId)
      .executeTakeFirst();
    if (!row) throw new NotFoundException();
    if (row.user_id !== user.id && user.role !== "OWNER") {
      throw new ForbiddenException();
    }
    await this.db
      .updateTable("comments")
      .set({ deleted_at: new Date() })
      .where("id", "=", commentId)
      .execute();
    this.events.emit({
      type: "deleted",
      postId: row.post_id,
      kind: row.kind,
      slug: row.slug,
      commentId,
    });
  }

  async reactToComment(commentId: string, userId: string, type: "like" | "dislike" | null) {
    if (type === null) {
      await this.db
        .deleteFrom("comment_reactions")
        .where("comment_id", "=", commentId)
        .where("user_id", "=", userId)
        .execute();
      return;
    }
    await this.db
      .insertInto("comment_reactions")
      .values({ comment_id: commentId, user_id: userId, type })
      .onConflict((oc) => oc.columns(["comment_id", "user_id"]).doUpdateSet({ type }))
      .execute();
  }
}
