import { Injectable } from "@nestjs/common";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(7000),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),

  OWNER_EMAIL: z.string().email(),

  PUBLIC_BASE_URL: z.string().url().default("http://localhost:3000"),
  PUBLIC_API_URL: z.string().url().default("http://localhost:7000"),

  RESEND_API_KEY: z.string().min(1).optional(),
  MAIL_FROM_DOMAIN: z.string().min(1).default("example.com"),
  MAIL_FROM_NAME: z.string().min(1).default("Umananda Siddha"),

  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  SANITY_PROJECT_ID: z.string().optional(),
  SANITY_DATASET: z.string().default("production"),
  SANITY_API_VERSION: z.string().default("2025-05-16"),
  SANITY_READ_TOKEN: z.string().optional(),

  // Cookie domain — leave empty for localhost dev. In prod with API on a
  // subdomain (e.g. portfolio.api.umanandasiddha.in) and client on another
  // (www.umanandasiddha.in), set to ".umanandasiddha.in" so cookies are
  // valid across both.
  COOKIE_DOMAIN: z.string().optional(),
});

export type EnvShape = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): EnvShape {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}

@Injectable()
export class Env implements EnvShape {
  NODE_ENV!: EnvShape["NODE_ENV"];
  PORT!: number;
  CORS_ORIGINS!: string;
  DATABASE_URL!: string;
  REDIS_URL!: string;
  JWT_ACCESS_SECRET!: string;
  JWT_REFRESH_SECRET!: string;
  JWT_ACCESS_TTL!: string;
  JWT_REFRESH_TTL!: string;
  OWNER_EMAIL!: string;
  PUBLIC_BASE_URL!: string;
  PUBLIC_API_URL!: string;
  RESEND_API_KEY?: string;
  MAIL_FROM_DOMAIN!: string;
  MAIL_FROM_NAME!: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
  SANITY_PROJECT_ID?: string;
  SANITY_DATASET!: string;
  SANITY_API_VERSION!: string;
  SANITY_READ_TOKEN?: string;
  COOKIE_DOMAIN?: string;
}
