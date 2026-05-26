import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { Request } from "express";
import { RevalidationService } from "./revalidation.service";

/**
 * Fires a revalidation bump on the public home page after any non-GET request
 * under `/admin/portfolio/*`. Wired globally via APP_INTERCEPTOR so every
 * portfolio CRUD controller gets cache-busting without manual plumbing.
 */
@Injectable()
export class PortfolioRevalidateInterceptor implements NestInterceptor {
  constructor(private readonly revalidate: RevalidationService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const isWrite = req.method !== "GET" && req.method !== "HEAD";
    const isPortfolioAdmin = req.path.startsWith("/admin/portfolio");
    return next.handle().pipe(
      tap({
        next: () => {
          if (isWrite && isPortfolioAdmin) {
            this.revalidate.bump(["/"]);
          }
        },
      }),
    );
  }
}
