/**
 * Sync portfolio DB with the most recent CV (UmanandaSiddha_26_05_2026.pdf).
 *
 * Touches only the surfaces the resume directly informs:
 *   - site_identity (site_url)
 *   - site_status   (currently_at)
 *   - hero          (current_card, stack_pills)
 *   - about         (prose, footnote)
 *   - side_facts    (full replace — keeps the same six "categories")
 *   - projects + project_metrics + project_bullets (sync to the four roles + three named projects)
 *
 * Leaves OSS repos, talks, books, uses, now_playing alone — the resume doesn't enumerate them.
 *
 * Run from server/:
 *   npx ts-node -r tsconfig-paths/register scripts/update-from-resume.ts
 */

import "dotenv/config";
import { sql } from "kysely";
import { createDatabase } from "../src/database/db";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const db = createDatabase(url);

  await db.transaction().execute(async (trx) => {
    // ---------- site_identity ----------
    await trx
      .updateTable("site_identity")
      .set({
        name: "Umananda Siddha",
        role: "Software Engineer · Backend-leaning full-stack",
        email: "umanandasiddha243@gmail.com",
        phone: "+91 7086400395",
        location: "Assam, India",
        github: "UmanandaSiddha",
        linkedin: "umananda-siddha-399b95217",
        site_url: "umanandasiddha.in",
      })
      .where("id", "=", 1)
      .execute();

    // ---------- site_status ----------
    await trx
      .updateTable("site_status")
      .set({
        available: "Open to collaborations",
        currently_at: "SportsTechX · Berlin (Remote)",
      })
      .where("id", "=", 1)
      .execute();

    // ---------- hero ----------
    // Headline + lede + card body use a tiny inline markup parsed by the
    // client: *…* renders italic+accent, _…_ renders accent-underlined.
    await trx
      .updateTable("hero")
      .set({
        eyebrow: "Portfolio · 2026 · Vol. 04",
        headline: ["Notes from a *backend*", "that mostly _stays up_."],
        lede:
          "I'm Umananda — I build *quiet backends* and the glue that holds product teams together. Lately: a project-tracking platform for non-technical founders, a RAG layer over GitHub / Slack / Linear chaos, and caching wins that shaved 40% off p95. This site is half portfolio, half field journal — there's a terminal you can actually type in, and a diary where I sometimes admit Docker beat me.",
        current_card: sql`${JSON.stringify({
          label: "// currently",
          body: "Software Engineer at *SportsTechX*, Berlin (Remote).",
          badge: "●  live",
        })}::jsonb`,
        stack_pills: [
          "TypeScript",
          "NestJS",
          "Next.js",
          "PostgreSQL",
          "Redis",
          "BullMQ",
          "PostGIS",
          "Supabase",
          "GraphQL",
          "WebRTC",
          "Docker",
          "AWS",
        ],
      })
      .where("id", "=", 1)
      .execute();

    // ---------- about ----------
    await trx
      .updateTable("about")
      .set({
        prose: [
          "I'm currently a Software Engineer at SportsTechX (Berlin, remote), refactoring the core platform and redesigning Supabase schemas so analytics and intelligence features stop fighting the data. Day-to-day is modular NestJS services, Next.js workflows, and a contextual chatbot that's slowly learning how the product is actually used.",
          "Before this I spent four months at Learn With Stack building Ovlox — an engineering intelligence platform stitching GitHub, Slack, Jira, Linear, and Discord into one knowledge layer, with a RAG-powered Q&A on top. Earlier, a year at Upesto on a NestJS + PostgreSQL + PostGIS backend where Redis caching and BullMQ background jobs cut p95 latency by 40%. Before that, a GraphQL/LMS stint at Vrixaa Labs with a Dockerized code-execution sandbox and an FFmpeg pipeline.",
          "Side of the desk: a WebRTC + mediasoup conferencing system (MeetUp), and MediCode — an OCR→LLM pipeline for medical text that picked up a Special Mention at the NIT Silchar Hackathon. Also Development Lead at GDG Tezpur (2024–25), finishing B.Tech ECE at Tezpur University (GPA 7.6/10).",
        ],
        footnote:
          "// TL;DR — TypeScript, NestJS, Postgres, Redis, Docker. Will argue about indexes at parties.",
      })
      .where("id", "=", 1)
      .execute();

    // ---------- side_facts ----------
    await trx.deleteFrom("side_facts").execute();
    await trx
      .insertInto("side_facts")
      .values([
        { k: "Based in", v: "Assam, IN · GMT+5:30", sort_order: 0 },
        { k: "Currently", v: "SportsTechX · SWE", sort_order: 1 },
        { k: "Specialty", v: "Backends, APIs, data plumbing", sort_order: 2 },
        { k: "Stack", v: "NestJS · PG · Redis", sort_order: 3 },
        { k: "Studying", v: "B.Tech ECE · GPA 7.6/10", sort_order: 4 },
        { k: "Community", v: "GDG Tezpur · Dev Lead '24–25", sort_order: 5 },
      ])
      .execute();

    // ---------- projects ----------
    // Resume Experience: SportsTechX (current), Learn With Stack (Ovlox), Upesto, Vrixaa Labs
    // Resume Projects:   Ovlox, MeetUp, MediCode
    // Strategy: sportstechx + ovlox + upesto + vrixaa + meetup + medicode. Drop voolata.

    type ProjectDef = {
      slug: string;
      name: string;
      sub: string;
      summary: string;
      tags: string[];
      sortOrder: number;
      metrics: Array<{ k: string; v: string }>;
      bullets: string[];
    };

    const projects: ProjectDef[] = [
      {
        slug: "sportstechx",
        name: "SportsTechX",
        sub: "nestjs · nextjs · supabase · berlin (remote) · 2026–present",
        summary:
          "Refactoring the core platform and redesigning Supabase schemas so analytics, intelligence, and user-support workflows scale without the seams showing.",
        tags: ["NestJS", "Next.js", "Supabase", "TypeScript"],
        sortOrder: 0,
        metrics: [
          { k: "role", v: "SWE" },
          { k: "stack", v: "NestJS+Next" },
          { k: "data", v: "Supabase" },
        ],
        bullets: [
          "Refactored core platform architecture and redesigned Supabase schemas for scalability and maintainability.",
          "Built modular backend services in NestJS and tightened frontend workflows in Next.js.",
          "Optimized data ingestion + querying paths feeding platform analytics and intelligence features.",
          "Building a contextual chatbot for product navigation and user-support workflows.",
        ],
      },
      {
        slug: "ovlox",
        name: "Ovlox (Learn With Stack)",
        sub: "nestjs · nextjs · postgres · rag · 2025–2026",
        summary:
          "Engineering intelligence platform that unifies GitHub, Slack, Jira, Linear, and Discord into one knowledge layer — with a RAG-powered Q&A on top.",
        tags: ["NestJS", "Next.js", "PostgreSQL", "RAG", "Vector Search"],
        sortOrder: 1,
        metrics: [
          { k: "integrations", v: "5" },
          { k: "Q&A layer", v: "RAG" },
          { k: "stack", v: "NestJS+PG" },
        ],
        bullets: [
          "Architected scalable NestJS + PostgreSQL backend services and modular Next.js frontend apps.",
          "Built unified ingestion pipelines aggregating engineering workflows and contextual project insights.",
          "Shipped a RAG-powered Q&A enabling natural-language querying over structured and unstructured project data.",
          "Document ingestion, chunking, embedding, and retrieval pipelines for contextual search.",
        ],
      },
      {
        slug: "upesto",
        name: "Upesto",
        sub: "nestjs · postgres · postgis · redis · aws · 2024–25",
        summary:
          "Backend engineering for a geo-aware product platform — faster APIs, location-first features, scalable media handling.",
        tags: ["NestJS", "PostgreSQL", "PostGIS", "Redis", "BullMQ", "AWS S3"],
        sortOrder: 2,
        metrics: [
          { k: "p95 drop", v: "40%" },
          { k: "geo search", v: "PostGIS" },
          { k: "uploads", v: "S3 presigned" },
        ],
        bullets: [
          "Improved API response times by 40% with Redis caching and BullMQ background jobs.",
          "Built geo-search + location-based features on PostgreSQL + PostGIS and the Google Maps APIs.",
          "Designed scalable media upload pipelines using AWS S3 presigned URLs.",
          "Contributed to scalable and fault-tolerant backend architecture decisions.",
        ],
      },
      {
        slug: "vrixaa",
        name: "Vrixaa Labs LMS",
        sub: "graphql · docker · ffmpeg · monaco · intern · 2024",
        summary:
          "GraphQL backend for an LMS platform — secure auth, an in-browser code sandbox, and a video pipeline that didn't catch fire.",
        tags: ["GraphQL", "Docker", "FFmpeg", "Monaco"],
        sortOrder: 3,
        metrics: [
          { k: "API", v: "GraphQL" },
          { k: "sandbox", v: "Docker" },
          { k: "pipeline", v: "FFmpeg" },
        ],
        bullets: [
          "GraphQL backend with secure multi-device authentication and refresh-token rotation.",
          "Dockerized code-execution service wired to a Monaco Editor integration for in-browser coding.",
          "FFmpeg-based video processing pipeline for media transformation and streaming workflows.",
        ],
      },
      {
        slug: "meetup",
        name: "MeetUp",
        sub: "webrtc · mediasoup · websockets · nodejs · side project",
        summary:
          "Multi-user real-time video conferencing with a mediasoup SFU and WebSocket signaling — room management, peer connections, and reconnection over flaky networks.",
        tags: ["WebRTC", "mediasoup", "WebSockets", "Node.js"],
        sortOrder: 4,
        metrics: [
          { k: "SFU", v: "mediasoup" },
          { k: "signaling", v: "WebSocket" },
          { k: "transport", v: "RTP" },
        ],
        bullets: [
          "Multi-user real-time video conferencing using WebRTC with a mediasoup SFU and WebSocket signaling.",
          "Room management, peer connections, and reconnection handling for unstable networks.",
          "RTP transport workflows and bandwidth optimization strategies.",
        ],
      },
      {
        slug: "medicode",
        name: "MediCode",
        sub: "ocr · python · gpt apis · hackathon · 2024",
        summary:
          "OCR→LLM pipeline that extracts, structures, and summarizes medical prescriptions and documents. Special Mention, NIT Silchar Hackathon '24.",
        tags: ["Python", "OCR", "LLM APIs", "GPT"],
        sortOrder: 5,
        metrics: [
          { k: "pipeline", v: "OCR→LLM" },
          { k: "summarize", v: "GPT" },
          { k: "award", v: "NIT Silchar '24" },
        ],
        bullets: [
          "Built an OCR-to-LLM pipeline to extract, structure, and summarize medical prescriptions and documents.",
          "Text extraction, preprocessing, and prompt-based summarization using GPT models.",
          "Special Mention at the NIT Silchar Hackathon (Jan 2024).",
        ],
      },
    ];

    // Drop projects that are no longer on the resume (cascades to metrics/bullets).
    await trx
      .deleteFrom("projects")
      .where("slug", "not in", projects.map((p) => p.slug))
      .execute();

    for (const p of projects) {
      const row = await trx
        .insertInto("projects")
        .values({
          slug: p.slug,
          name: p.name,
          sub: p.sub,
          summary: p.summary,
          tags: p.tags,
          sort_order: p.sortOrder,
        })
        .onConflict((oc) =>
          oc.column("slug").doUpdateSet({
            name: p.name,
            sub: p.sub,
            summary: p.summary,
            tags: p.tags,
            sort_order: p.sortOrder,
          }),
        )
        .returning("id")
        .executeTakeFirstOrThrow();

      // Replace metrics + bullets wholesale — they're sortable and per-project.
      await trx.deleteFrom("project_metrics").where("project_id", "=", row.id).execute();
      if (p.metrics.length) {
        await trx
          .insertInto("project_metrics")
          .values(
            p.metrics.map((m, idx) => ({
              project_id: row.id,
              k: m.k,
              v: m.v,
              sort_order: idx,
            })),
          )
          .execute();
      }

      await trx.deleteFrom("project_bullets").where("project_id", "=", row.id).execute();
      if (p.bullets.length) {
        await trx
          .insertInto("project_bullets")
          .values(
            p.bullets.map((body, idx) => ({
              project_id: row.id,
              body,
              sort_order: idx,
            })),
          )
          .execute();
      }
    }
  });

  // Report
  const counts = await Promise.all([
    db.selectFrom("projects").select(db.fn.countAll<string>().as("n")).executeTakeFirstOrThrow(),
    db.selectFrom("project_metrics").select(db.fn.countAll<string>().as("n")).executeTakeFirstOrThrow(),
    db.selectFrom("project_bullets").select(db.fn.countAll<string>().as("n")).executeTakeFirstOrThrow(),
    db.selectFrom("side_facts").select(db.fn.countAll<string>().as("n")).executeTakeFirstOrThrow(),
  ]);

  console.log(
    JSON.stringify(
      {
        ok: true,
        projects: Number(counts[0].n),
        project_metrics: Number(counts[1].n),
        project_bullets: Number(counts[2].n),
        side_facts: Number(counts[3].n),
      },
      null,
      2,
    ),
  );

  await db.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
