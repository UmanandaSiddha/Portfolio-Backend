import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { THROTTLER_CONFIG } from "./common/throttler.config";
import { ConfigModule } from "./config/config.module";
import { DatabaseModule } from "./database/database.module";
import { MailModule } from "./mail/mail.module";
import { AuthModule } from "./auth/auth.module";
import { PortfolioModule } from "./portfolio/portfolio.module";
import { PostsModule } from "./posts/posts.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { SuggestionsModule } from "./suggestions/suggestions.module";
import { AdminStatsModule } from "./admin/stats.controller";
import { MeModule } from "./me/me.module";
import { HealthController } from "./health.controller";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { OwnerSkipThrottlerGuard } from "./common/guards/throttler.guard";
import { RolesGuard } from "./common/guards/roles.guard";

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRoot(THROTTLER_CONFIG),
    DatabaseModule,
    MailModule,
    AuthModule,
    PortfolioModule,
    SubscriptionsModule,
    PostsModule,
    SuggestionsModule,
    AdminStatsModule,
    MeModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: JWT first so req.user is populated, then the throttler
    // can let OWNER-role requests skip rate limits.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: OwnerSkipThrottlerGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
