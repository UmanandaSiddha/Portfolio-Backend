import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Logger,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { DATABASE } from "../database/database.module";
import type { AppDb } from "../database/db";
import { Env } from "../config/env.schema";
import { Public } from "../common/decorators/public.decorator";
import { SubscriptionDispatcher } from "../subscriptions/dispatcher.service";
import { RevalidationService } from "../revalidation/revalidation.service";

type SanityWebhookPayload = {
  _id: string;
  _type: "blogPost" | "diaryEntry";
  _rev?: string;
  operation?: "create" | "update" | "delete";
  slug?: string | null;
  title?: string | null;
  kicker?: string | null;
  publishedAt?: string | null;
  readTime?: number | null;
  tags?: string[] | null;
  coverImageUrl?: string | null;
};

@Controller("webhooks")
export class SanityWebhookController {
  private readonly logger = new Logger(SanityWebhookController.name);

  constructor(
    @Inject(DATABASE) private readonly db: AppDb,
    private readonly env: Env,
    private readonly dispatcher: SubscriptionDispatcher,
    private readonly revalidate: RevalidationService,
  ) {}

  private verifySignature(rawBody: Buffer, signatureHeader: string | undefined) {
    if (!signatureHeader) {
      throw new UnauthorizedException("Missing Sanity webhook signature header");
    }
    // Header format: "t=<unix>,v1=<base64url-of-hmac-sha256(secret, `${t}.${body}`)>"
    const parts = Object.fromEntries(
      signatureHeader.split(",").map((p) => {
        const [k, ...rest] = p.split("=");
        return [k.trim(), rest.join("=")];
      }),
    );
    const t = parts.t;
    const sig = parts.v1;
    if (!t || !sig) throw new UnauthorizedException("Malformed signature header");

    const tNum = Number(t);
    if (!Number.isFinite(tNum)) throw new UnauthorizedException("Bad signature timestamp");
    const ageSec = Math.abs(Date.now() / 1000 - tNum);
    if (ageSec > 300) throw new UnauthorizedException("Webhook timestamp too old");

    const expected = createHmac("sha256", this.env.SANITY_WEBHOOK_SECRET)
      .update(`${t}.${rawBody.toString("utf8")}`)
      .digest();
    const provided = Buffer.from(sig, "base64url");
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw new UnauthorizedException("Invalid signature");
    }
  }

  @Public()
  @Post("sanity")
  @HttpCode(200)
  async sanity(
    @Req() req: Request,
    @Headers("sanity-webhook-signature") sigHeader: string | undefined,
    @Body() body: SanityWebhookPayload,
  ) {
    const raw = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!raw) throw new BadRequestException("rawBody not captured — bootstrap with rawBody=true");
    this.verifySignature(raw, sigHeader);

    if (!body._id || !body._type) {
      throw new BadRequestException("Webhook missing _id/_type");
    }
    const kind = body._type === "blogPost" ? "blog" : "diary";
    const isDelete = body.operation === "delete";

    if (isDelete) {
      const removed = await this.db
        .deleteFrom("posts")
        .where("sanity_id", "=", body._id)
        .returning(["slug", "kind"])
        .executeTakeFirst();
      this.revalidate.bump(
        removed ? ["/", `/${removed.kind}/${removed.slug}`] : ["/"],
      );
      return { ok: true, deleted: true };
    }

    if (!body.slug || !body.title) {
      throw new BadRequestException("Webhook missing slug or title for non-delete operation");
    }

    const publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;
    const isPublished = !!publishedAt && publishedAt.getTime() <= Date.now();

    // Detect first-time publish for blogs → enqueue subscriber emails
    const existing = await this.db
      .selectFrom("posts")
      .select(["id", "is_published"])
      .where("sanity_id", "=", body._id)
      .executeTakeFirst();

    const upserted = await this.db
      .insertInto("posts")
      .values({
        sanity_id: body._id,
        kind,
        slug: body.slug,
        title: body.title,
        kicker: body.kicker ?? null,
        published_at: publishedAt,
        read_time_min: body.readTime ?? null,
        is_published: isPublished,
        tags: body.tags ?? [],
        cover_image_url: body.coverImageUrl ?? null,
      })
      .onConflict((oc) =>
        oc.column("sanity_id").doUpdateSet({
          kind,
          slug: body.slug ?? "",
          title: body.title ?? "",
          kicker: body.kicker ?? null,
          published_at: publishedAt,
          read_time_min: body.readTime ?? null,
          is_published: isPublished,
          tags: body.tags ?? [],
          cover_image_url: body.coverImageUrl ?? null,
        }),
      )
      .returning(["id", "kind", "title", "slug", "kicker", "is_published"])
      .executeTakeFirstOrThrow();

    const justPublishedBlog =
      upserted.kind === "blog" &&
      upserted.is_published &&
      (!existing || !existing.is_published);

    if (justPublishedBlog) {
      this.dispatcher.enqueueNewPost(upserted.id).catch((err) => {
        this.logger.error(`Dispatcher enqueue failed: ${(err as Error).message}`);
      });
    }

    this.revalidate.bump(["/", `/${upserted.kind}/${upserted.slug}`]);

    return { ok: true, id: upserted.id, justPublishedBlog };
  }
}
