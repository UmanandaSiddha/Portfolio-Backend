import { Controller, Get } from "@nestjs/common";
import { SiteService } from "./site/site.service";
import { ProjectsService } from "./projects/projects.service";
import { OssService } from "./oss/oss.module";
import { TalksService } from "./talks/talks.module";
import { BooksService } from "./books/books.module";
import { UsesService } from "./uses/uses.module";
import { NowPlayingService } from "./now-playing/now-playing.module";
import { ExperienceService } from "./experience/experience.module";
import { EducationService } from "./education/education.module";
import { PostsService } from "../posts/posts.service";
import { Public } from "../common/decorators/public.decorator";

@Controller("api/portfolio")
export class PortfolioPublicController {
  constructor(
    private readonly site: SiteService,
    private readonly projects: ProjectsService,
    private readonly oss: OssService,
    private readonly talks: TalksService,
    private readonly books: BooksService,
    private readonly uses: UsesService,
    private readonly nowPlaying: NowPlayingService,
    private readonly experience: ExperienceService,
    private readonly education: EducationService,
    private readonly posts: PostsService,
  ) {}

  /**
   * One-shot endpoint that returns the whole DATA object the client expects.
   * Matches the shape of client/lib/types.ts:PortfolioData.
   */
  @Public()
  @Get()
  async get() {
    const [identity, status, hero, about, sideFacts, projects, oss, blog, diary, talks, reading, nowPlaying, usesGroups, sections, experience, education] =
      await Promise.all([
        this.site.getIdentity(),
        this.site.getStatus(),
        this.site.getHero(),
        this.site.getAbout(),
        this.site.listSideFacts(),
        this.projects.list(),
        this.oss.list(),
        this.posts.list("blog"),
        this.posts.list("diary"),
        this.talks.list(),
        this.books.list(),
        this.nowPlaying.list(),
        this.uses.listAll(),
        this.site.listSections(),
        this.experience.list(),
        this.education.list(),
      ]);

    return {
      name: identity?.name ?? "",
      role: identity?.role ?? "",
      email: identity?.email ?? "",
      phone: identity?.phone ?? "",
      location: identity?.location ?? "",
      github: identity?.github ?? "",
      linkedin: identity?.linkedin ?? "",
      site: identity?.site_url ?? "",
      avatarUrl: identity?.avatar_url ?? null,
      spotifyPlaylistUrl: identity?.spotify_playlist_url ?? null,
      status: {
        available: status?.available ?? "",
        currentlyAt: status?.currently_at ?? "",
      },
      hero: {
        eyebrow: hero?.eyebrow ?? "",
        headline: hero?.headline ?? [],
        lede: hero?.lede ?? "",
        currentCard: hero?.current_card ?? {},
        stackPills: hero?.stack_pills ?? [],
      },
      about: {
        prose: about?.prose ?? [],
        footnote: about?.footnote ?? "",
      },
      sideFacts: sideFacts.map((f) => ({ k: f.k, v: f.v })),
      projects: projects.map((p) => ({
        id: p.slug,
        name: p.name,
        sub: p.sub,
        summary: p.summary,
        metrics: p.metrics,
        bullets: p.bullets,
        tags: p.tags,
        links: p.links,
      })),
      oss: oss.map((o) => ({
        name: o.name,
        repo: o.repo,
        desc: o.description,
        lang: o.lang,
        stars: o.stars,
        updated: o.updated_label,
      })),
      blog,
      diary,
      uses: {
        editor: pickGroupItems(usesGroups, "editor"),
        hardware: pickGroupItems(usesGroups, "hardware"),
        stack: pickGroupItems(usesGroups, "stack"),
      },
      talks: talks.map((t) => ({ when: t.when_label, title: t.title, where: t.where_label })),
      reading: reading.map((b) => ({
        title: b.title,
        author: b.author,
        status: b.status,
        pct: b.pct,
        coverImageUrl: b.cover_image_url,
        buyUrl: b.buy_url,
      })),
      nowPlaying: nowPlaying.map((n) => ({ track: n.track, artist: n.artist })),
      sections: sections.map((s) => ({ key: s.key, label: s.label, visible: s.visible })),
      experience: experience.map((e) => ({
        id: e.id,
        role: e.role,
        company: e.company,
        location: e.location,
        period: e.period,
        bullets: e.bullets,
      })),
      education: education.map((e) => ({
        id: e.id,
        institution: e.institution,
        degree: e.degree,
        detail: e.detail,
        period: e.period,
      })),
    };
  }
}

function pickGroupItems(
  groups: Array<{ key: string; items: Array<{ lbl: string; sub: string; val: string }> }>,
  key: string,
) {
  const g = groups.find((x) => x.key === key);
  if (!g) return [];
  return g.items.map((i) => ({ lbl: i.lbl, sub: i.sub, val: i.val }));
}
