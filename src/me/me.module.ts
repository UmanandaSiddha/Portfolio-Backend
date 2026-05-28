import {
  Controller,
  Get,
  Inject,
  Injectable,
  Module,
  Post,
} from "@nestjs/common";
import { DATABASE } from "../database/database.module";
import type { AppDb } from "../database/db";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../common/decorators/current-user.decorator";

type PostCard = {
  id: string;
  slug: string;
  kind: "blog" | "diary";
  title: string;
  kicker: string | null;
  publishedAt: string | null;
  coverImageUrl: string | null;
};

type LikedCard = PostCard & { reactedAt: string; type: "like" | "dislike" };
type CommentedCard = PostCard & { commentCount: number; lastCommentAt: string };

type SubscriptionInfo =
  | { status: "none" }
  | {
      status: "pending" | "active" | "unsubscribed";
      email: string;
      createdAt: string;
      confirmedAt: string | null;
      unsubscribedAt: string | null;
    };

function iso(v: unknown): string {
  if (v == null) return "";
  return v instanceof Date ? v.toISOString() : new Date(v as string).toISOString();
}

function postCard(row: {
  id: string;
  slug: string;
  kind: "blog" | "diary";
  title: string;
  kicker: string | null;
  published_at: Date | string | null;
  cover_image_url: string | null;
}): PostCard {
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind,
    title: row.title,
    kicker: row.kicker,
    publishedAt: row.published_at ? iso(row.published_at) : null,
    coverImageUrl: row.cover_image_url,
  };
}

@Injectable()
export class MeService {
  constructor(@Inject(DATABASE) private readonly db: AppDb) {}

  async activity(userId: string): Promise<{
    reactions: LikedCard[];
    commented: CommentedCard[];
  }> {
    const reactions = await this.db
      .selectFrom("post_reactions as r")
      .innerJoin("posts as p", "p.id", "r.post_id")
      .select([
        "p.id",
        "p.slug",
        "p.kind",
        "p.title",
        "p.kicker",
        "p.published_at",
        "p.cover_image_url",
        "r.type",
        "r.created_at as reacted_at",
      ])
      .where("r.user_id", "=", userId)
      .orderBy("r.created_at", "desc")
      .execute();

    const commented = await this.db
      .selectFrom("comments as c")
      .innerJoin("posts as p", "p.id", "c.post_id")
      .select((eb) => [
        "p.id",
        "p.slug",
        "p.kind",
        "p.title",
        "p.kicker",
        "p.published_at",
        "p.cover_image_url",
        eb.fn.count<number>("c.id").as("comment_count"),
        eb.fn.max("c.created_at").as("last_comment_at"),
      ])
      .where("c.user_id", "=", userId)
      .where("c.deleted_at", "is", null)
      .groupBy([
        "p.id",
        "p.slug",
        "p.kind",
        "p.title",
        "p.kicker",
        "p.published_at",
        "p.cover_image_url",
      ])
      .orderBy("last_comment_at", "desc")
      .execute();

    return {
      reactions: reactions.map((r) => ({
        ...postCard(r),
        type: r.type,
        reactedAt: iso(r.reacted_at),
      })),
      commented: commented.map((r) => ({
        ...postCard(r),
        commentCount: Number(r.comment_count ?? 0),
        lastCommentAt: iso(r.last_comment_at as Date | string),
      })),
    };
  }

  async subscription(email: string): Promise<SubscriptionInfo> {
    const row = await this.db
      .selectFrom("subscriptions")
      .select(["email", "confirmed_at", "unsubscribed_at", "created_at"])
      .where("email", "=", email)
      .executeTakeFirst();
    if (!row) return { status: "none" };
    const status: "pending" | "active" | "unsubscribed" = row.unsubscribed_at
      ? "unsubscribed"
      : row.confirmed_at
        ? "active"
        : "pending";
    return {
      status,
      email: row.email,
      createdAt: iso(row.created_at),
      confirmedAt: row.confirmed_at ? iso(row.confirmed_at) : null,
      unsubscribedAt: row.unsubscribed_at ? iso(row.unsubscribed_at) : null,
    };
  }

  async unsubscribe(email: string): Promise<SubscriptionInfo> {
    await this.db
      .updateTable("subscriptions")
      .set({ unsubscribed_at: new Date() })
      .where("email", "=", email)
      .where("unsubscribed_at", "is", null)
      .execute();
    return this.subscription(email);
  }
}

@Controller("me")
export class MeController {
  constructor(private readonly svc: MeService) {}

  @Get("activity")
  activity(@CurrentUser() user: CurrentUserPayload) {
    return this.svc.activity(user.id);
  }

  @Get("subscription")
  subscription(@CurrentUser() user: CurrentUserPayload) {
    return this.svc.subscription(user.email);
  }

  @Post("subscription/unsubscribe")
  unsubscribe(@CurrentUser() user: CurrentUserPayload) {
    return this.svc.unsubscribe(user.email);
  }
}

@Module({
  controllers: [MeController],
  providers: [MeService],
})
export class MeModule {}
