import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY, type Role } from "../decorators/roles.decorator";
import type { CurrentUserPayload } from "../decorators/current-user.decorator";
import type { Request } from "express";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required || required.length === 0) return true;
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { user?: CurrentUserPayload }>();
    const user = req.user;
    if (!user) throw new ForbiddenException("Not authenticated");
    if (!required.includes(user.role)) {
      throw new ForbiddenException(`Requires role: ${required.join(", ")}`);
    }
    return true;
  }
}
