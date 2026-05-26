import { Controller, Get, Module } from "@nestjs/common";
import { Roles } from "../common/decorators/roles.decorator";
import { AdminStatsService } from "./stats.service";

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
  providers: [AdminStatsService],
  exports: [AdminStatsService],
})
export class AdminStatsModule {}
