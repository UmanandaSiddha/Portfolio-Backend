import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DATABASE } from "../database/database.module";
import type { AppDb } from "../database/db";
import type { PostKind } from "../database/types";
import { SanityService, SanityPostMeta } from "../sanity/sanity.service";
import { SubscriptionDispatcher } from "../subscriptions/dispatcher.service";

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

type EngagementCounts = {
  likes: number;
  dislikes: number;
  comments: number;
  views: number;
};

@Injectable()
export class PostsService {
  constructor(
    @Inject(DATABASE) private readonly db: AppDb,
    private readonly sanity: SanityService,
    private readonly dispatcher: SubscriptionDispatcher,
  ) {}

  /**
   * Lookup the local posts row by (kind, slug). If absent, GROQ Sanity for the
   * post metadata, upsert by sanity_id, return the row. Throws NotFound if Sanity
   * has no matching published post. First-time upserts also fire the subscriber
   * blast (blog only) — same behaviour the deleted webhook used to provide.
   */
  async resolvePost(kind: PostKind, slug: string): Promise<{ id: string; sanity_id: string }> {
    const existing = await this.db
      .selectFrom("posts")
      .select(["id", "sanity_id"])
      .where("kind", "=", kind)
      .where("slug", "=", slug)
      .executeTakeFirst();
    if (existing) return existing;

    const meta = await this.sanity.fetchPostMeta(kind, slug);
    if (!meta) throw new NotFoundException();

    const inserted = await this.upsertFromSanity(meta);
    if (kind === "blog") {
      this.dispatcher.enqueueNewPost(inserted.id).catch(() => {
        // logged inside dispatcher; engagement must not fail because the blast did
      });
    }
    return { id: inserted.id, sanity_id: inserted.sanity_id };
  }

  /** Public list — Sanity is the source of truth; local table only contributes engagement counts. */
  async list(kind: PostKind): Promise<PostListItem[]> {
    const metas = await this.sanity.listPostsMeta(kind);
    if (metas.length === 0) return [];
    const counts = await this.countsBySanityId(metas.map((m) => m.sanityId));
    return metas.map((m) => this.merge(m, counts.get(m.sanityId)));
  }

  async getBySlug(kind: PostKind, slug: string): Promise<PostListItem> {
    const meta = await this.sanity.fetchPostMeta(kind, slug);
    if (!meta) throw new NotFoundException();
    const counts = await this.countsBySanityId([meta.sanityId]);
    return this.merge(meta, counts.get(meta.sanityId));
  }

  async adminList(): Promise<AdminPostRow[]> {
    const [blog, diary] = await Promise.all([
      this.sanity.listPostsMeta("blog"),
      this.sanity.listPostsMeta("diary"),
    ]);
    const metas = [...blog, ...diary];
    if (metas.length === 0) return [];
    const counts = await this.countsBySanityId(metas.map((m) => m.sanityId));
    return metas
      .map((m) => ({
        ...this.merge(m, counts.get(m.sanityId)),
        kind: m.kind,
        isPublished: true,
        sanityId: m.sanityId,
      }))
      .sort((a, b) => {
        const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return tb - ta;
      });
  }

  async recordView(args: {
    kind: PostKind;
    slug: string;
    viewerHash: string;
    userId?: string | null;
    sessionId?: string | null;
  }) {
    const post = await this.resolvePost(args.kind, args.slug);
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
    const post = await this.resolvePost(args.kind, args.slug);
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

  /** Manually triggered subscriber email blast — replaces the webhook auto-trigger. */
  async blast(kind: PostKind, slug: string): Promise<{ enqueuedFor: string }> {
    if (kind !== "blog") {
      throw new NotFoundException("Only blog posts can be blasted to subscribers");
    }
    const post = await this.resolvePost(kind, slug);
    await this.dispatcher.enqueueNewPost(post.id);
    return { enqueuedFor: post.id };
  }

  /**
   * Proactive full reconciliation — pull every published post from Sanity and
   * upsert into the local DB. Existing engagement (comments / views / reactions)
   * is preserved via sanity_id as the conflict key. Orphan local rows (posts
   * unpublished or deleted in Sanity) are NOT removed — a temporarily-unpublished
   * doc shouldn't lose its engagement on a sync; explicit admin delete instead.
   */
  async syncFromSanity(): Promise<{
    upserted: number;
    blogs: number;
    diaries: number;
    orphansInDb: number;
  }> {
    const [blogMetas, diaryMetas] = await Promise.all([
      this.sanity.listPostsMeta("blog"),
      this.sanity.listPostsMeta("diary"),
    ]);
    const metas = [...blogMetas, ...diaryMetas];
    for (const m of metas) {
      await this.upsertFromSanity(m);
    }

    const knownIds = new Set(metas.map((m) => m.sanityId));
    const localIds = await this.db.selectFrom("posts").select(["sanity_id"]).execute();
    const orphans = localIds.filter((r) => !knownIds.has(r.sanity_id)).length;

    return {
      upserted: metas.length,
      blogs: blogMetas.length,
      diaries: diaryMetas.length,
      orphansInDb: orphans,
    };
  }

  private async upsertFromSanity(meta: SanityPostMeta) {
    return this.db
      .insertInto("posts")
      .values({
        sanity_id: meta.sanityId,
        kind: meta.kind,
        slug: meta.slug,
        title: meta.title,
        kicker: meta.kicker,
        published_at: meta.publishedAt ? new Date(meta.publishedAt) : null,
        read_time_min: meta.readTimeMin,
        is_published: true,
        tags: meta.tags,
        cover_image_url: meta.coverImageUrl,
      })
      .onConflict((oc) =>
        oc.column("sanity_id").doUpdateSet({
          kind: meta.kind,
          slug: meta.slug,
          title: meta.title,
          kicker: meta.kicker,
          published_at: meta.publishedAt ? new Date(meta.publishedAt) : null,
          read_time_min: meta.readTimeMin,
          is_published: true,
          tags: meta.tags,
          cover_image_url: meta.coverImageUrl,
        }),
      )
      .returning(["id", "sanity_id"])
      .executeTakeFirstOrThrow();
  }

  private async countsBySanityId(sanityIds: string[]): Promise<Map<string, EngagementCounts>> {
    const out = new Map<string, EngagementCounts>();
    if (sanityIds.length === 0) return out;
    const rows = await this.db
      .selectFrom("posts as p")
      .select((eb) => [
        "p.sanity_id",
        eb.selectFrom("post_reactions as r").select(eb.fn.countAll<number>().as("c"))
          .whereRef("r.post_id", "=", "p.id").where("r.type", "=", "like").as("likes"),
        eb.selectFrom("post_reactions as r").select(eb.fn.countAll<number>().as("c"))
          .whereRef("r.post_id", "=", "p.id").where("r.type", "=", "dislike").as("dislikes"),
        eb.selectFrom("comments as c").select(eb.fn.countAll<number>().as("c"))
          .whereRef("c.post_id", "=", "p.id").where("c.deleted_at", "is", null).as("comments"),
        eb.selectFrom("post_views as v").select(eb.fn.countAll<number>().as("c"))
          .whereRef("v.post_id", "=", "p.id").as("views"),
      ])
      .where("p.sanity_id", "in", sanityIds)
      .execute();
    for (const r of rows) {
      out.set(r.sanity_id, {
        likes: Number(r.likes ?? 0),
        dislikes: Number(r.dislikes ?? 0),
        comments: Number(r.comments ?? 0),
        views: Number(r.views ?? 0),
      });
    }
    return out;
  }

  private merge(meta: SanityPostMeta, counts: EngagementCounts | undefined): PostListItem {
    return {
      id: meta.sanityId,
      slug: meta.slug,
      title: meta.title,
      kicker: meta.kicker,
      publishedAt: meta.publishedAt,
      readTimeMin: meta.readTimeMin,
      tags: meta.tags,
      coverImageUrl: meta.coverImageUrl,
      likes: counts?.likes ?? 0,
      dislikes: counts?.dislikes ?? 0,
      comments: counts?.comments ?? 0,
      views: counts?.views ?? 0,
    };
  }
}
