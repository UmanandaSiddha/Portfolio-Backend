import { Global, Injectable, Logger, Module } from "@nestjs/common";
import { Env } from "../config/env.schema";

@Injectable()
export class RevalidationService {
  private readonly logger = new Logger(RevalidationService.name);

  constructor(private readonly env: Env) {}

  /**
   * Tell the Next.js client to revalidate the given paths immediately.
   * Fire-and-forget: a failed revalidate must NOT fail the underlying write.
   * When CLIENT_REVALIDATE_URL or REVALIDATE_SECRET are absent the call
   * short-circuits and the client falls back to its time-based `revalidate`.
   */
  bump(paths: string[]): void {
    const url = this.env.CLIENT_REVALIDATE_URL;
    const secret = this.env.REVALIDATE_SECRET;
    if (!url || !secret || paths.length === 0) return;
    void this.send(url, secret, paths);
  }

  private async send(baseUrl: string, secret: string, paths: string[]) {
    try {
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/revalidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths, secret }),
      });
      if (!res.ok) {
        this.logger.warn(
          `Revalidate POST returned ${res.status} for ${paths.join(", ")}`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Revalidate POST failed for ${paths.join(", ")}: ${(err as Error).message}`,
      );
    }
  }
}

@Global()
@Module({
  providers: [RevalidationService],
  exports: [RevalidationService],
})
export class RevalidationModule {}
