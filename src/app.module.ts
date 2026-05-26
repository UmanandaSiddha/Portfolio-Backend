import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
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
import { RevalidationModule } from "./revalidation/revalidation.service";
import { PortfolioRevalidateInterceptor } from "./revalidation/portfolio-revalidate.interceptor";
import { HealthController } from "./health.controller";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";

@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRoot(THROTTLER_CONFIG),
    DatabaseModule,
    MailModule,
    RevalidationModule,
    AuthModule,
    PortfolioModule,
    SubscriptionsModule,
    PostsModule,
    SuggestionsModule,
    AdminStatsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: PortfolioRevalidateInterceptor },
  ],
})
export class AppModule {}
