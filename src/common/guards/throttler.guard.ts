import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { Request } from "express";
import type { CurrentUserPayload } from "../decorators/current-user.decorator";

/**
 * Standard throttler, with one exception: OWNER-role requests are not
 * rate-limited. The owner runs the admin panel and routinely fans out
 * many parallel requests on page load (stats, posts, projects, identity, …)
 * which would otherwise burst over the global per-IP limits.
 */
@Injectable()
export class OwnerSkipThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: CurrentUserPayload }>();
    return req.user?.role === "OWNER";
  }
}
