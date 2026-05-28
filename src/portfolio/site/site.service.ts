import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DATABASE } from "../../database/database.module";
import type { AppDb } from "../../database/db";
import type {
  UpdateAboutDto,
  UpdateHeroDto,
  UpdateSiteIdentityDto,
  UpdateSiteStatusDto,
  CreateSideFactDto,
  UpdateSideFactDto,
} from "./site.dto";

@Injectable()
export class SiteService {
  constructor(@Inject(DATABASE) private readonly db: AppDb) {}

  // --- Identity ---
  async getIdentity() {
    const row = await this.db.selectFrom("site_identity").selectAll().executeTakeFirst();
    return row ?? null;
  }
  async upsertIdentity(dto: UpdateSiteIdentityDto) {
    const values = {
      id: 1,
      name: dto.name,
      role: dto.role,
      email: dto.email,
      phone: dto.phone ?? null,
      location: dto.location ?? null,
      github: dto.github ?? null,
      linkedin: dto.linkedin ?? null,
      site_url: dto.siteUrl ?? null,
      avatar_url: dto.avatarUrl ?? null,
    };
    return this.db
      .insertInto("site_identity")
      .values(values)
      .onConflict((oc) => oc.column("id").doUpdateSet({
        name: values.name,
        role: values.role,
        email: values.email,
        phone: values.phone,
        location: values.location,
        github: values.github,
        linkedin: values.linkedin,
        site_url: values.site_url,
        avatar_url: values.avatar_url,
      }))
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  // --- Music (single curated Spotify playlist) ---
  async setMusic(spotifyPlaylistUrl: string | null) {
    const row = await this.db
      .insertInto("site_identity")
      .values({
        id: 1,
        name: "",
        role: "",
        email: "placeholder@example.com",
        spotify_playlist_url: spotifyPlaylistUrl,
      })
      .onConflict((oc) =>
        oc.column("id").doUpdateSet({ spotify_playlist_url: spotifyPlaylistUrl }),
      )
      .returning(["spotify_playlist_url"])
      .executeTakeFirstOrThrow();
    return { spotifyPlaylistUrl: row.spotify_playlist_url };
  }

  // --- Status ---
  async getStatus() {
    return (await this.db.selectFrom("site_status").selectAll().executeTakeFirst()) ?? null;
  }
  async upsertStatus(dto: UpdateSiteStatusDto) {
    const values = { id: 1, available: dto.available, currently_at: dto.currentlyAt ?? null };
    return this.db
      .insertInto("site_status")
      .values(values)
      .onConflict((oc) => oc.column("id").doUpdateSet({
        available: values.available,
        currently_at: values.currently_at,
      }))
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  // --- Hero ---
  async getHero() {
    return (await this.db.selectFrom("hero").selectAll().executeTakeFirst()) ?? null;
  }
  async upsertHero(dto: UpdateHeroDto) {
    const values = {
      id: 1,
      eyebrow: dto.eyebrow,
      headline: dto.headline,
      lede: dto.lede,
      current_card: dto.currentCard as unknown,
      stack_pills: dto.stackPills,
    };
    return this.db
      .insertInto("hero")
      .values(values)
      .onConflict((oc) => oc.column("id").doUpdateSet({
        eyebrow: values.eyebrow,
        headline: values.headline,
        lede: values.lede,
        current_card: values.current_card,
        stack_pills: values.stack_pills,
      }))
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  // --- About ---
  async getAbout() {
    return (await this.db.selectFrom("about").selectAll().executeTakeFirst()) ?? null;
  }
  async upsertAbout(dto: UpdateAboutDto) {
    const values = { id: 1, prose: dto.prose, footnote: dto.footnote ?? null };
    return this.db
      .insertInto("about")
      .values(values)
      .onConflict((oc) => oc.column("id").doUpdateSet({
        prose: values.prose,
        footnote: values.footnote,
      }))
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  // --- Side facts (collection) ---
  listSideFacts() {
    return this.db
      .selectFrom("side_facts")
      .selectAll()
      .orderBy("sort_order")
      .orderBy("created_at")
      .execute();
  }
  async createSideFact(dto: CreateSideFactDto) {
    return this.db
      .insertInto("side_facts")
      .values({ k: dto.k, v: dto.v, sort_order: dto.sortOrder ?? 0 })
      .returningAll()
      .executeTakeFirstOrThrow();
  }
  async updateSideFact(id: string, dto: UpdateSideFactDto) {
    const updates: Record<string, unknown> = {};
    if (dto.k !== undefined) updates.k = dto.k;
    if (dto.v !== undefined) updates.v = dto.v;
    if (dto.sortOrder !== undefined) updates.sort_order = dto.sortOrder;
    if (Object.keys(updates).length === 0) {
      const existing = await this.db.selectFrom("side_facts").selectAll().where("id", "=", id).executeTakeFirst();
      if (!existing) throw new NotFoundException();
      return existing;
    }
    const row = await this.db
      .updateTable("side_facts")
      .set(updates)
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();
    if (!row) throw new NotFoundException();
    return row;
  }
  async deleteSideFact(id: string) {
    const r = await this.db.deleteFrom("side_facts").where("id", "=", id).executeTakeFirst();
    if (r.numDeletedRows === 0n) throw new NotFoundException();
  }

  // --- Section visibility ---
  listSections() {
    return this.db
      .selectFrom("sections")
      .select(["key", "label", "visible", "sort_order"])
      .orderBy("sort_order", "asc")
      .execute();
  }

  async setSectionVisibility(key: string, visible: boolean) {
    const row = await this.db
      .updateTable("sections")
      .set({ visible })
      .where("key", "=", key)
      .returning(["key", "label", "visible", "sort_order"])
      .executeTakeFirst();
    if (!row) throw new NotFoundException(`Unknown section "${key}"`);
    return row;
  }
}
