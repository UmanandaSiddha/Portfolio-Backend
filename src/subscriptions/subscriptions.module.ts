import {
  BadRequestException, Body, Controller, Get, Headers, HttpCode,
  Inject, Injectable, Module, Query, Post,
} from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { IsEmail, IsOptional, IsString } from "class-validator";
import { DATABASE } from "../database/database.module";
import type { AppDb } from "../database/db";
import { Env } from "../config/env.schema";
import { MailService } from "../mail/mail.service";
import { Public } from "../common/decorators/public.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { confirmSubscriptionTemplate } from "../mail/templates";
import { SubscriptionDispatcher } from "./dispatcher.service";
import { SubscriptionEmailWorker } from "./subscription.worker";
import { SUBSCRIPTION_EMAIL_QUEUE } from "./queue.constants";

export class SubscribeDto {
  @IsEmail() email!: string;
  @IsOptional() @IsString() source?: string;
}
export class TokenQuery {
  @IsString() token!: string;
}

@Injectable()
export class SubscriptionsService {
  constructor(
    @Inject(DATABASE) private readonly db: AppDb,
    private readonly env: Env,
    private readonly mail: MailService,
    private readonly dispatcher: SubscriptionDispatcher,
  ) {}

  async subscribe(dto: SubscribeDto) {
    const { token, hash } = this.dispatcher.generateConfirmToken();
    const existing = await this.db
      .selectFrom("subscriptions")
      .selectAll()
      .where("email", "=", dto.email)
      .executeTakeFirst();

    if (existing) {
      if (existing.confirmed_at && !existing.unsubscribed_at) {
        // Already an active sub — no email; idempotent success
        return { ok: true };
      }
      await this.db
        .updateTable("subscriptions")
        .set({
          token_hash: hash,
          unsubscribed_at: null,
          confirmed_at: null,
          source: dto.source ?? existing.source ?? null,
        })
        .where("id", "=", existing.id)
        .execute();
    } else {
      await this.db
        .insertInto("subscriptions")
        .values({
          email: dto.email,
          token_hash: hash,
          source: dto.source ?? null,
        })
        .execute();
    }

    const link = `${this.env.PUBLIC_API_URL}/subscriptions/confirm?token=${token}`;
    await this.mail.send({
      to: dto.email,
      ...confirmSubscriptionTemplate({ link }),
    });
    return { ok: true };
  }

  async confirm(token: string) {
    const hash = this.dispatcher.hashConfirmToken(token);
    const row = await this.db
      .selectFrom("subscriptions")
      .select(["id", "confirmed_at"])
      .where("token_hash", "=", hash)
      .executeTakeFirst();
    if (!row) throw new BadRequestException("Invalid or expired token");
    if (!row.confirmed_at) {
      await this.db
        .updateTable("subscriptions")
        .set({ confirmed_at: new Date(), unsubscribed_at: null })
        .where("id", "=", row.id)
        .execute();
    }
    return { ok: true };
  }

  async unsubscribe(token: string) {
    const decoded = this.dispatcher.verifyUnsubscribeToken(token);
    if (!decoded) throw new BadRequestException("Invalid token");
    await this.db
      .updateTable("subscriptions")
      .set({ unsubscribed_at: new Date() })
      .where("email", "=", decoded.email)
      .execute();
    return { ok: true };
  }

  async adminList() {
    return this.db
      .selectFrom("subscriptions")
      .select(["id", "email", "confirmed_at", "unsubscribed_at", "source", "created_at"])
      .orderBy("created_at", "desc")
      .execute();
  }
}

@Controller("subscriptions")
export class SubscriptionsController {
  constructor(private readonly svc: SubscriptionsService) {}

  @Public()
  @Post()
  @HttpCode(200)
  subscribe(@Body() dto: SubscribeDto) {
    return this.svc.subscribe(dto);
  }

  @Public()
  @Get("confirm")
  confirm(@Query() q: TokenQuery, @Headers("accept") accept?: string) {
    return this.svc.confirm(q.token).then((r) => {
      if (accept?.includes("text/html")) {
        return { ok: true, message: "Subscription confirmed. You'll get an email on every new blog post." };
      }
      return r;
    });
  }

  @Public()
  @Get("unsubscribe")
  unsubscribe(@Query() q: TokenQuery, @Headers("accept") accept?: string) {
    return this.svc.unsubscribe(q.token).then((r) => {
      if (accept?.includes("text/html")) {
        return { ok: true, message: "Unsubscribed. You won't receive future emails." };
      }
      return r;
    });
  }

  @Roles("OWNER")
  @Get("admin/all")
  adminList() {
    return this.svc.adminList();
  }
}

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [Env],
      useFactory: (env: Env) => ({
        connection: { url: env.REDIS_URL },
      }),
    }),
    BullModule.registerQueue({ name: SUBSCRIPTION_EMAIL_QUEUE }),
  ],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    SubscriptionDispatcher,
    SubscriptionEmailWorker,
  ],
  exports: [SubscriptionsService, SubscriptionDispatcher],
})
export class SubscriptionsModule {}
