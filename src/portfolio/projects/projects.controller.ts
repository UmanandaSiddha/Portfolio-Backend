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
import { ProjectsService } from "./projects.service";
import { Roles } from "../../common/decorators/roles.decorator";
import { CreateProjectDto, UpdateProjectDto } from "./projects.dto";

@Controller("admin/portfolio/projects")
@Roles("OWNER")
export class ProjectsAdminController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list() {
    return this.projects.list();
  }

  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projects.create(dto);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateProjectDto) {
    return this.projects.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id") id: string) {
    await this.projects.remove(id);
  }
}
