import { Module, OnApplicationBootstrap } from "@nestjs/common";
import { PostsService } from "./posts.service";
import { PostsController } from "./posts.controller";
import { CommentsService } from "./comments.service";
import { CommentsController } from "./comments.controller";
import { CommentEventsBus } from "./comments.events";
import { SanityService } from "../sanity/sanity.service";
import { SanityWebhookController } from "../sanity/webhook.controller";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";

@Module({
  imports: [SubscriptionsModule],
  controllers: [PostsController, CommentsController, SanityWebhookController],
  providers: [PostsService, CommentsService, CommentEventsBus, SanityService],
  exports: [PostsService, SanityService],
})
export class PostsModule implements OnApplicationBootstrap {
  constructor(private readonly bus: CommentEventsBus) {}
  onApplicationBootstrap() {
    this.bus.startHeartbeat();
  }
}
