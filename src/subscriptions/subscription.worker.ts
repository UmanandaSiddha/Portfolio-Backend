import { Inject, Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { DATABASE } from "../database/database.module";
import type { AppDb } from "../database/db";
import { Env } from "../config/env.schema";
import { MailService } from "../mail/mail.service";
import { newBlogPostTemplate } from "../mail/templates";
import {
  SUBSCRIPTION_EMAIL_QUEUE,
  type SubscriptionDeliveryJob,
} from "./queue.constants";
import { buildUnsubscribeToken } from "./tokens.util";

@Processor(SUBSCRIPTION_EMAIL_QUEUE, { concurrency: 4 })
export class SubscriptionEmailWorker extends WorkerHost {
  private readonly logger = new Logger(SubscriptionEmailWorker.name);

  constructor(
    @Inject(DATABASE) private readonly db: AppDb,
    private readonly env: Env,
    private readonly mail: MailService,
  ) {
    super();
  }

  async process(job: Job<SubscriptionDeliveryJob>): Promise<void> {
    const { deliveryId } = job.data;

    const row = await this.db
      .selectFrom("subscription_deliveries as d")
      .innerJoin("subscriptions as s", "s.id", "d.subscription_id")
      .innerJoin("posts as p", "p.id", "d.post_id")
      .select([
        "d.id as delivery_id",
        "d.status as delivery_status",
        "s.email",
        "s.unsubscribed_at",
        "p.slug as post_slug",
        "p.title as post_title",
        "p.kicker as post_kicker",
        "p.is_published",
      ])
      .where("d.id", "=", deliveryId)
      .executeTakeFirst();

    if (!row) {
      this.logger.warn(`Delivery ${deliveryId} not found — skipping`);
      return;
    }
    if (row.delivery_status === "sent") {
      this.logger.debug(`Delivery ${deliveryId} already sent — skipping`);
      return;
    }
    if (row.unsubscribed_at) {
      await this.db
        .updateTable("subscription_deliveries")
        .set({ status: "failed", error: "unsubscribed before send" })
        .where("id", "=", deliveryId)
        .execute();
      return;
    }
    if (!row.is_published) {
      await this.db
        .updateTable("subscription_deliveries")
        .set({ status: "failed", error: "post unpublished before send" })
        .where("id", "=", deliveryId)
        .execute();
      return;
    }

    const readUrl = `${this.env.PUBLIC_BASE_URL}/blog/${row.post_slug}`;
    const unsubscribeUrl = `${this.env.PUBLIC_API_URL}/subscriptions/unsubscribe?token=${buildUnsubscribeToken(
      row.email,
      this.env.JWT_REFRESH_SECRET,
    )}`;

    try {
      await this.mail.send({
        to: row.email,
        ...newBlogPostTemplate({
          title: row.post_title,
          kicker: row.post_kicker,
          readUrl,
          unsubscribeUrl,
        }),
      });
      await this.db
        .updateTable("subscription_deliveries")
        .set({ status: "sent", sent_at: new Date() })
        .where("id", "=", deliveryId)
        .execute();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Send failed for delivery ${deliveryId}: ${message}`);
      await this.db
        .updateTable("subscription_deliveries")
        .set({ status: "failed", error: message })
        .where("id", "=", deliveryId)
        .execute();
      throw err; // BullMQ retry
    }
  }
}
