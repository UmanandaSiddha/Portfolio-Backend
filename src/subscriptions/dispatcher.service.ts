import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { DATABASE } from "../database/database.module";
import type { AppDb } from "../database/db";
import { Env } from "../config/env.schema";
import {
  SUBSCRIPTION_EMAIL_QUEUE,
  type SubscriptionDeliveryJob,
} from "./queue.constants";
import {
  buildUnsubscribeToken,
  generateConfirmToken,
  hashConfirmToken,
  verifyUnsubscribeToken,
} from "./tokens.util";

@Injectable()
export class SubscriptionDispatcher {
  private readonly logger = new Logger(SubscriptionDispatcher.name);

  constructor(
    @Inject(DATABASE) private readonly db: AppDb,
    private readonly env: Env,
    @InjectQueue(SUBSCRIPTION_EMAIL_QUEUE)
    private readonly queue: Queue<SubscriptionDeliveryJob>,
  ) {}

  // Token helpers — thin wrappers so callers stay unaware of the secret.
  buildUnsubscribeToken(email: string): string {
    return buildUnsubscribeToken(email, this.env.JWT_REFRESH_SECRET);
  }
  verifyUnsubscribeToken(token: string): { email: string } | null {
    return verifyUnsubscribeToken(token, this.env.JWT_REFRESH_SECRET);
  }
  generateConfirmToken(): { token: string; hash: string } {
    return generateConfirmToken(this.env.JWT_REFRESH_SECRET);
  }
  hashConfirmToken(token: string): string {
    return hashConfirmToken(token, this.env.JWT_REFRESH_SECRET);
  }

  /**
   * Enqueue subscriber emails for a newly-published blog post.
   * 1. Insert a `subscription_deliveries` row per active subscriber (UNIQUE(sub, post) dedupes webhook retries).
   * 2. Enqueue a BullMQ job per new delivery; worker handles sending + status updates.
   */
  async enqueueNewPost(postId: string): Promise<void> {
    const post = await this.db
      .selectFrom("posts")
      .select(["id", "kind", "is_published"])
      .where("id", "=", postId)
      .executeTakeFirst();
    if (!post || post.kind !== "blog" || !post.is_published) return;

    const subs = await this.db
      .selectFrom("subscriptions")
      .select(["id", "email"])
      .where("confirmed_at", "is not", null)
      .where("unsubscribed_at", "is", null)
      .execute();
    if (subs.length === 0) return;

    for (const sub of subs) {
      let delivery: { id: number } | undefined;
      try {
        delivery = await this.db
          .insertInto("subscription_deliveries")
          .values({
            subscription_id: sub.id,
            post_id: post.id,
            status: "queued",
          })
          .returning("id")
          .executeTakeFirst();
      } catch {
        // UNIQUE(sub, post) violation — already enqueued previously
        continue;
      }
      if (!delivery) continue;

      await this.queue.add(
        "deliver",
        { deliveryId: delivery.id },
        {
          jobId: `delivery:${delivery.id}`,
          attempts: 5,
          backoff: { type: "exponential", delay: 30_000 },
          removeOnComplete: { age: 86_400, count: 5_000 },
          removeOnFail: { age: 604_800 },
        },
      );
    }

    this.logger.log(`Enqueued ${subs.length} subscriber email(s) for post ${post.id}`);
  }
}
