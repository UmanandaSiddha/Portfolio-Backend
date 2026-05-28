import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { SiteService } from "./site.service";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  CreateSideFactDto,
  UpdateAboutDto,
  UpdateHeroDto,
  UpdateMusicDto,
  UpdateSectionVisibilityDto,
  UpdateSideFactDto,
  UpdateSiteIdentityDto,
  UpdateSiteStatusDto,
} from "./site.dto";

@Controller("admin/portfolio")
@Roles("OWNER")
export class SiteAdminController {
  constructor(private readonly site: SiteService) {}

  @Put("identity")
  identity(@Body() dto: UpdateSiteIdentityDto) {
    return this.site.upsertIdentity(dto);
  }

  @Put("status")
  status(@Body() dto: UpdateSiteStatusDto) {
    return this.site.upsertStatus(dto);
  }

  @Put("hero")
  hero(@Body() dto: UpdateHeroDto) {
    return this.site.upsertHero(dto);
  }

  @Put("about")
  about(@Body() dto: UpdateAboutDto) {
    return this.site.upsertAbout(dto);
  }

  @Get("side-facts")
  listSideFacts() {
    return this.site.listSideFacts();
  }

  @Post("side-facts")
  createSideFact(@Body() dto: CreateSideFactDto) {
    return this.site.createSideFact(dto);
  }

  @Put("side-facts/:id")
  updateSideFact(@Param("id") id: string, @Body() dto: UpdateSideFactDto) {
    return this.site.updateSideFact(id, dto);
  }

  @Delete("side-facts/:id")
  @HttpCode(204)
  async deleteSideFact(@Param("id") id: string) {
    await this.site.deleteSideFact(id);
  }

  @Get("sections")
  listSections() {
    return this.site.listSections();
  }

  @Put("sections/:key")
  setSectionVisibility(
    @Param("key") key: string,
    @Body() dto: UpdateSectionVisibilityDto,
  ) {
    return this.site.setSectionVisibility(key, dto.visible);
  }

  @Put("music")
  setMusic(@Body() dto: UpdateMusicDto) {
    const url = dto.spotifyPlaylistUrl?.trim();
    return this.site.setMusic(url ? url : null);
  }
}
