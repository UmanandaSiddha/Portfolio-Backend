import { Injectable } from "@nestjs/common";
import { createClient, SanityClient } from "@sanity/client";
import { Env } from "../config/env.schema";

@Injectable()
export class SanityService {
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
}
