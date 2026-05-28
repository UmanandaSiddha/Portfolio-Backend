import { Controller, Get, Module } from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { AdminStatsService } from "./stats.service";
import { SanityService } from "../sanity/sanity.service";

@Controller("admin")
@Roles("OWNER")
export class AdminStatsController {
  constructor(private readonly stats: AdminStatsService) {}

  @Get("stats")
  get() {
    return this.stats.get();
  }
}

@Module({
  controllers: [AdminStatsController],
  providers: [AdminStatsService, SanityService],
  exports: [AdminStatsService],
})
export class AdminStatsModule {}
