import { Inject, Injectable } from "@nestjs/common";
import { sql } from "kysely";
import { DATABASE } from "../database/database.module";
import type { AppDb } from "../database/db";

export type AdminStats = {
  subscribers: {
    active: number;
    pending: number;
    unsubscribed: number;
    newLast7d: number;
  };
  posts: {
    total: number;
    blogs: number;
    diaries: number;
    viewsAllTime: number;
    viewsLast7d: number;
    mostViewedLast7d: {
      kind: "blog" | "diary";
      slug: string;
      title: string;
      views: number;
    } | null;
  };
  comments: { total: number; last7d: number };
  suggestions: { new: number; read: number; archived: number };
};

@Injectable()
export class AdminStatsService {
  constructor(@Inject(DATABASE) private readonly db: AppDb) {}

  async get(): Promise<AdminStats> {
    const isoCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    // Kysely's Timestamp brand wraps every timestamptz column; comparing against a
    // bare Date/string fails the type-check. The cast routes through a parameterised
    // SQL fragment with an explicit ::timestamptz cast — Postgres parses the value safely.
    const sevenDaysAgo = sql`${isoCutoff}::timestamptz` as never;
    const fn = this.db.fn;
    const toNum = (v: unknown) => Number(v ?? 0);

    const [
      subs,
      posts,
      viewsAllRow,
      views7dRow,
      topPost,
      commentsAllRow,
      comments7dRow,
      sugg,
    ] = await Promise.all([
      this.db
        .selectFrom("subscriptions")
        .select((eb) => [
          fn.countAll<number>().filterWhere(eb.and([
            eb("confirmed_at", "is not", null),
            eb("unsubscribed_at", "is", null),
          ])).as("active"),
          fn.countAll<number>().filterWhere(eb.and([
            eb("confirmed_at", "is", null),
            eb("unsubscribed_at", "is", null),
          ])).as("pending"),
          fn.countAll<number>().filterWhere(eb("unsubscribed_at", "is not", null)).as("unsubscribed"),
          fn.countAll<number>().filterWhere(eb("created_at", ">=", sevenDaysAgo)).as("new7d"),
        ])
        .executeTakeFirstOrThrow(),

      this.db
        .selectFrom("posts")
        .select((eb) => [
          fn.countAll<number>().as("total"),
          fn.countAll<number>().filterWhere(eb("kind", "=", "blog")).as("blogs"),
          fn.countAll<number>().filterWhere(eb("kind", "=", "diary")).as("diaries"),
        ])
        .executeTakeFirstOrThrow(),

      this.db
        .selectFrom("post_views")
        .select(fn.countAll<number>().as("c"))
        .executeTakeFirstOrThrow(),

      this.db
        .selectFrom("post_views")
        .select(fn.countAll<number>().as("c"))
        .where("viewed_at", ">=", sevenDaysAgo)
        .executeTakeFirstOrThrow(),

      this.db
        .selectFrom("post_views as v")
        .innerJoin("posts as p", "p.id", "v.post_id")
        .select(["p.kind", "p.slug", "p.title", fn.countAll<number>().as("views")])
        .where("v.viewed_at", ">=", sevenDaysAgo)
        .groupBy(["p.kind", "p.slug", "p.title"])
        .orderBy("views", "desc")
        .limit(1)
        .executeTakeFirst(),

      this.db
        .selectFrom("comments")
        .select(fn.countAll<number>().as("c"))
        .where("deleted_at", "is", null)
        .executeTakeFirstOrThrow(),

      this.db
        .selectFrom("comments")
        .select(fn.countAll<number>().as("c"))
        .where("deleted_at", "is", null)
        .where("created_at", ">=", sevenDaysAgo)
        .executeTakeFirstOrThrow(),

      this.db
        .selectFrom("suggestions")
        .select((eb) => [
          fn.countAll<number>().filterWhere(eb("status", "=", "new")).as("new"),
          fn.countAll<number>().filterWhere(eb("status", "=", "read")).as("read"),
          fn.countAll<number>().filterWhere(eb("status", "=", "archived")).as("archived"),
        ])
        .executeTakeFirstOrThrow(),
    ]);

    return {
      subscribers: {
        active: toNum(subs.active),
        pending: toNum(subs.pending),
        unsubscribed: toNum(subs.unsubscribed),
        newLast7d: toNum(subs.new7d),
      },
      posts: {
        total: toNum(posts.total),
        blogs: toNum(posts.blogs),
        diaries: toNum(posts.diaries),
        viewsAllTime: toNum(viewsAllRow.c),
        viewsLast7d: toNum(views7dRow.c),
        mostViewedLast7d: topPost
          ? {
              kind: topPost.kind,
              slug: topPost.slug,
              title: topPost.title,
              views: toNum(topPost.views),
            }
          : null,
      },
      comments: {
        total: toNum(commentsAllRow.c),
        last7d: toNum(comments7dRow.c),
      },
      suggestions: {
        new: toNum(sugg.new),
        read: toNum(sugg.read),
        archived: toNum(sugg.archived),
      },
    };
  }
}
