import { Injectable, Logger } from "@nestjs/common";
import { createClient, SanityClient } from "@sanity/client";
import { Env } from "../config/env.schema";

export type SanityPostMeta = {
  sanityId: string;
  kind: "blog" | "diary";
  slug: string;
  title: string;
  kicker: string | null;
  publishedAt: string | null;
  readTimeMin: number | null;
  tags: string[];
  coverImageUrl: string | null;
};

const POST_FIELDS = /* groq */ `{
  "sanityId": _id,
  "kind": select(_type == "blogPost" => "blog", "diary"),
  "slug": slug.current,
  title,
  kicker,
  publishedAt,
  "readTimeMin": readTime,
  "tags": coalesce(tags, []),
  "coverImageUrl": coverImage.asset->url
}`;

const LIST_QUERY = /* groq */ `
  *[_type == $type && defined(slug.current) && defined(publishedAt) && publishedAt <= now()]
    | order(publishedAt desc) ${POST_FIELDS}
`;

const SINGLE_QUERY = /* groq */ `
  *[_type == $type && slug.current == $slug && defined(publishedAt) && publishedAt <= now()][0] ${POST_FIELDS}
`;

@Injectable()
export class SanityService {
  private readonly logger = new Logger(SanityService.name);
  readonly client: SanityClient | null;

  constructor(env: Env) {
    if (env.SANITY_PROJECT_ID) {
      this.client = createClient({
        projectId: env.SANITY_PROJECT_ID,
        dataset: env.SANITY_DATASET,
        apiVersion: env.SANITY_API_VERSION,
        useCdn: env.NODE_ENV === "production",
        token: env.SANITY_READ_TOKEN,
        perspective: "published",
      });
    } else {
      this.client = null;
    }
  }

  async listPostsMeta(kind: "blog" | "diary"): Promise<SanityPostMeta[]> {
    if (!this.client) return [];
    try {
      const rows = await this.client.fetch<SanityPostMeta[]>(LIST_QUERY, {
        type: kind === "blog" ? "blogPost" : "diaryEntry",
      });
      return rows ?? [];
    } catch (err) {
      this.logger.warn(`Sanity listPostsMeta(${kind}) failed: ${(err as Error).message}`);
      return [];
    }
  }

  async fetchPostMeta(kind: "blog" | "diary", slug: string): Promise<SanityPostMeta | null> {
    if (!this.client) return null;
    try {
      return await this.client.fetch<SanityPostMeta | null>(SINGLE_QUERY, {
        type: kind === "blog" ? "blogPost" : "diaryEntry",
        slug,
      });
    } catch (err) {
      this.logger.warn(`Sanity fetchPostMeta(${kind}, ${slug}) failed: ${(err as Error).message}`);
      return null;
    }
  }
}
