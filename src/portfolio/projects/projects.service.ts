import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DATABASE } from "../../database/database.module";
import type { AppDb } from "../../database/db";
import type { CreateProjectDto, UpdateProjectDto } from "./projects.dto";

export type ProjectWithChildren = {
  id: string;
  slug: string;
  name: string;
  sub: string;
  summary: string;
  tags: string[];
  sortOrder: number;
  metrics: Array<{ k: string; v: string }>;
  bullets: string[];
  links: Array<{ label: string; url: string }>;
};

@Injectable()
export class ProjectsService {
  constructor(@Inject(DATABASE) private readonly db: AppDb) {}

  async list(): Promise<ProjectWithChildren[]> {
    const projects = await this.db
      .selectFrom("projects")
      .selectAll()
      .orderBy("sort_order")
      .orderBy("created_at")
      .execute();
    if (projects.length === 0) return [];
    const ids = projects.map((p) => p.id);
    const metrics = await this.db
      .selectFrom("project_metrics")
      .select(["project_id", "k", "v", "sort_order"])
      .where("project_id", "in", ids)
      .orderBy("sort_order")
      .execute();
    const bullets = await this.db
      .selectFrom("project_bullets")
      .select(["project_id", "body", "sort_order"])
      .where("project_id", "in", ids)
      .orderBy("sort_order")
      .execute();
    const links = await this.db
      .selectFrom("project_links")
      .select(["project_id", "label", "url", "sort_order"])
      .where("project_id", "in", ids)
      .orderBy("sort_order")
      .execute();
    return projects.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      sub: p.sub,
      summary: p.summary,
      tags: p.tags,
      sortOrder: p.sort_order,
      metrics: metrics
        .filter((m) => m.project_id === p.id)
        .map((m) => ({ k: m.k, v: m.v })),
      bullets: bullets
        .filter((b) => b.project_id === p.id)
        .map((b) => b.body),
      links: links
        .filter((l) => l.project_id === p.id)
        .map((l) => ({ label: l.label, url: l.url })),
    }));
  }

  async create(dto: CreateProjectDto): Promise<ProjectWithChildren> {
    return this.db.transaction().execute(async (tx) => {
      const project = await tx
        .insertInto("projects")
        .values({
          slug: dto.slug,
          name: dto.name,
          sub: dto.sub,
          summary: dto.summary,
          tags: dto.tags,
          sort_order: dto.sortOrder ?? 0,
        })
        .returningAll()
        .executeTakeFirstOrThrow();
      if (dto.metrics.length > 0) {
        await tx
          .insertInto("project_metrics")
          .values(
            dto.metrics.map((m, i) => ({
              project_id: project.id,
              k: m.k,
              v: m.v,
              sort_order: i,
            })),
          )
          .execute();
      }
      if (dto.bullets.length > 0) {
        await tx
          .insertInto("project_bullets")
          .values(
            dto.bullets.map((b, i) => ({
              project_id: project.id,
              body: b,
              sort_order: i,
            })),
          )
          .execute();
      }
      const links = dto.links ?? [];
      if (links.length > 0) {
        await tx
          .insertInto("project_links")
          .values(
            links.map((l, i) => ({
              project_id: project.id,
              label: l.label,
              url: l.url,
              sort_order: i,
            })),
          )
          .execute();
      }
      return {
        id: project.id,
        slug: project.slug,
        name: project.name,
        sub: project.sub,
        summary: project.summary,
        tags: project.tags,
        sortOrder: project.sort_order,
        metrics: dto.metrics,
        bullets: dto.bullets,
        links,
      };
    });
  }

  async update(id: string, dto: UpdateProjectDto): Promise<ProjectWithChildren> {
    await this.db.transaction().execute(async (tx) => {
      const updates: Record<string, unknown> = {};
      if (dto.slug !== undefined) updates.slug = dto.slug;
      if (dto.name !== undefined) updates.name = dto.name;
      if (dto.sub !== undefined) updates.sub = dto.sub;
      if (dto.summary !== undefined) updates.summary = dto.summary;
      if (dto.tags !== undefined) updates.tags = dto.tags;
      if (dto.sortOrder !== undefined) updates.sort_order = dto.sortOrder;
      if (Object.keys(updates).length > 0) {
        const r = await tx
          .updateTable("projects")
          .set(updates)
          .where("id", "=", id)
          .executeTakeFirst();
        if (r.numUpdatedRows === 0n) throw new NotFoundException();
      }
      if (dto.metrics !== undefined) {
        await tx.deleteFrom("project_metrics").where("project_id", "=", id).execute();
        if (dto.metrics.length > 0) {
          await tx
            .insertInto("project_metrics")
            .values(dto.metrics.map((m, i) => ({
              project_id: id, k: m.k, v: m.v, sort_order: i,
            })))
            .execute();
        }
      }
      if (dto.bullets !== undefined) {
        await tx.deleteFrom("project_bullets").where("project_id", "=", id).execute();
        if (dto.bullets.length > 0) {
          await tx
            .insertInto("project_bullets")
            .values(dto.bullets.map((b, i) => ({
              project_id: id, body: b, sort_order: i,
            })))
            .execute();
        }
      }
      if (dto.links !== undefined) {
        await tx.deleteFrom("project_links").where("project_id", "=", id).execute();
        if (dto.links.length > 0) {
          await tx
            .insertInto("project_links")
            .values(dto.links.map((l, i) => ({
              project_id: id, label: l.label, url: l.url, sort_order: i,
            })))
            .execute();
        }
      }
    });
    const fresh = await this.list();
    const found = fresh.find((p) => p.id === id);
    if (!found) throw new NotFoundException();
    return found;
  }

  async remove(id: string): Promise<void> {
    const r = await this.db.deleteFrom("projects").where("id", "=", id).executeTakeFirst();
    if (r.numDeletedRows === 0n) throw new NotFoundException();
  }
}
