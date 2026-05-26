import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Like JwtAuthGuard but does NOT throw if the bearer token is missing/invalid.
 * Use on endpoints that accept both anonymous and authenticated requests
 * (e.g. POST /posts/:slug/views).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser>(_err: unknown, user: TUser): TUser {
    return user as TUser;
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
