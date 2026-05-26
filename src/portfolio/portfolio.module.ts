import { Module } from "@nestjs/common";
import { SiteService } from "./site/site.service";
import { SiteAdminController } from "./site/site.controller";
import { ProjectsService } from "./projects/projects.service";
import { ProjectsAdminController } from "./projects/projects.controller";
import { OssModule } from "./oss/oss.module";
import { TalksModule } from "./talks/talks.module";
import { BooksModule } from "./books/books.module";
import { UsesModule } from "./uses/uses.module";
import { NowPlayingModule } from "./now-playing/now-playing.module";
import { PostsModule } from "../posts/posts.module";
import { PortfolioPublicController } from "./public.controller";

@Module({
  imports: [
    OssModule,
    TalksModule,
    BooksModule,
    UsesModule,
    NowPlayingModule,
    PostsModule,
  ],
  controllers: [
    SiteAdminController,
    ProjectsAdminController,
    PortfolioPublicController,
  ],
  providers: [SiteService, ProjectsService],
  exports: [SiteService, ProjectsService],
})
export class PortfolioModule {}
