import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { sql } from "kysely";
import { DATABASE } from "../database/database.module";
import type { AppDb } from "../database/db";
import type { PostKind } from "../database/types";

export type PostListItem = {
  id: string;
  slug: string;
  title: string;
  kicker: string | null;
  publishedAt: string | null;
  readTimeMin: number | null;
  tags: string[];
  coverImageUrl: string | null;
  likes: number;
  dislikes: number;
  comments: number;
  views: number;
};

export type AdminPostRow = PostListItem & {
  kind: PostKind;
  isPublished: boolean;
  sanityId: string;
};

@Injectable()
export class PostsService {
  constructor(@Inject(DATABASE) private readonly db: AppDb) {}

  async adminList(): Promise<AdminPostRow[]> {
    const rows = await this.db
      .selectFrom("posts as p")
      .select((eb) => [
        "p.id", "p.slug", "p.title", "p.kicker", "p.published_at",
        "p.read_time_min", "p.tags", "p.cover_image_url", "p.kind",
        "p.is_published", "p.sanity_id",
        eb.selectFrom("post_reactions as r").select(eb.fn.countAll<number>().as("c"))
          .whereRef("r.post_id", "=", "p.id").where("r.type", "=", "like").as("likes"),
        eb.selectFrom("post_reactions as r").select(eb.fn.countAll<number>().as("c"))
          .whereRef("r.post_id", "=", "p.id").where("r.type", "=", "dislike").as("dislikes"),
        eb.selectFrom("comments as c").select(eb.fn.countAll<number>().as("c"))
          .whereRef("c.post_id", "=", "p.id").where("c.deleted_at", "is", null).as("comments"),
        eb.selectFrom("post_views as v").select(eb.fn.countAll<number>().as("c"))
          .whereRef("v.post_id", "=", "p.id").as("views"),
      ])
      .orderBy("p.published_at", "desc")
      .execute();
    return rows.map((r) => ({
      ...this.map(r),
      kind: r.kind,
      isPublished: r.is_published,
      sanityId: r.sanity_id,
    }));
  }

  async list(kind: PostKind): Promise<PostListItem[]> {
    const rows = await this.db
      .selectFrom("posts as p")
      .select((eb) => [
        "p.id", "p.slug", "p.title", "p.kicker", "p.published_at",
        "p.read_time_min", "p.tags", "p.cover_image_url",
        eb
          .selectFrom("post_reactions as r")
          .select(eb.fn.countAll<number>().as("c"))
          .whereRef("r.post_id", "=", "p.id")
          .where("r.type", "=", "like")
          .as("likes"),
        eb
          .selectFrom("post_reactions as r")
          .select(eb.fn.countAll<number>().as("c"))
          .whereRef("r.post_id", "=", "p.id")
          .where("r.type", "=", "dislike")
          .as("dislikes"),
        eb
          .selectFrom("comments as c")
          .select(eb.fn.countAll<number>().as("c"))
          .whereRef("c.post_id", "=", "p.id")
          .where("c.deleted_at", "is", null)
          .as("comments"),
        eb
          .selectFrom("post_views as v")
          .select(eb.fn.countAll<number>().as("c"))
          .whereRef("v.post_id", "=", "p.id")
          .as("views"),
      ])
      .where("p.kind", "=", kind)
      .where("p.is_published", "=", true)
      .orderBy("p.published_at", "desc")
      .execute();
    return rows.map(this.map);
  }

  async getBySlug(kind: PostKind, slug: string): Promise<PostListItem & { id: string }> {
    const row = await this.db
      .selectFrom("posts as p")
      .select((eb) => [
        "p.id", "p.slug", "p.title", "p.kicker", "p.published_at",
        "p.read_time_min", "p.tags", "p.cover_image_url",
        eb
          .selectFrom("post_reactions as r")
          .select(eb.fn.countAll<number>().as("c"))
          .whereRef("r.post_id", "=", "p.id")
          .where("r.type", "=", "like")
          .as("likes"),
        eb
          .selectFrom("post_reactions as r")
          .select(eb.fn.countAll<number>().as("c"))
          .whereRef("r.post_id", "=", "p.id")
          .where("r.type", "=", "dislike")
          .as("dislikes"),
        eb
          .selectFrom("comments as c")
          .select(eb.fn.countAll<number>().as("c"))
          .whereRef("c.post_id", "=", "p.id")
          .where("c.deleted_at", "is", null)
          .as("comments"),
        eb
          .selectFrom("post_views as v")
          .select(eb.fn.countAll<number>().as("c"))
          .whereRef("v.post_id", "=", "p.id")
          .as("views"),
      ])
      .where("p.kind", "=", kind)
      .where("p.slug", "=", slug)
      .where("p.is_published", "=", true)
      .executeTakeFirst();
    if (!row) throw new NotFoundException();
    return this.map(row);
  }

  async recordView(args: {
    kind: PostKind;
    slug: string;
    viewerHash: string;
    userId?: string | null;
    sessionId?: string | null;
  }) {
    const post = await this.db
      .selectFrom("posts")
      .select(["id"])
      .where("kind", "=", args.kind)
      .where("slug", "=", args.slug)
      .where("is_published", "=", true)
      .executeTakeFirst();
    if (!post) throw new NotFoundException();
    try {
      await this.db
        .insertInto("post_views")
        .values({
          post_id: post.id,
          viewer_hash: args.viewerHash,
          user_id: args.userId ?? null,
          session_id: args.sessionId ?? null,
        })
        .execute();
    } catch {
      // unique violation on (post_id, viewer_hash, hour) — already counted
    }
  }

  async setReaction(args: { kind: PostKind; slug: string; userId: string; type: "like" | "dislike" | null }) {
    const post = await this.db
      .selectFrom("posts")
      .select(["id"])
      .where("kind", "=", args.kind)
      .where("slug", "=", args.slug)
      .where("is_published", "=", true)
      .executeTakeFirst();
    if (!post) throw new NotFoundException();
    if (args.type === null) {
      await this.db
        .deleteFrom("post_reactions")
        .where("post_id", "=", post.id)
        .where("user_id", "=", args.userId)
        .execute();
      return;
    }
    await this.db
      .insertInto("post_reactions")
      .values({ post_id: post.id, user_id: args.userId, type: args.type })
      .onConflict((oc) => oc.columns(["post_id", "user_id"]).doUpdateSet({ type: args.type! }))
      .execute();
  }

  private map = (row: {
    id: string; slug: string; title: string; kicker: string | null;
    published_at: Date | string | null; read_time_min: number | null;
    tags: string[]; cover_image_url: string | null;
    likes: number | string | null; dislikes: number | string | null;
    comments: number | string | null; views: number | string | null;
  }): PostListItem => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    kicker: row.kicker,
    publishedAt: row.published_at instanceof Date
      ? row.published_at.toISOString()
      : row.published_at,
    readTimeMin: row.read_time_min,
    tags: row.tags,
    coverImageUrl: row.cover_image_url,
    likes: Number(row.likes ?? 0),
    dislikes: Number(row.dislikes ?? 0),
    comments: Number(row.comments ?? 0),
    views: Number(row.views ?? 0),
  });
}

export const _useSql = sql; // keep import-tree happy
