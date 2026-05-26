import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";
import { Role } from "./roles.decorator";

export type CurrentUserPayload = {
  id: string;
  email: string;
  role: Role;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload | undefined => {
    const req = ctx.switchToHttp().getRequest<Request & { user?: CurrentUserPayload }>();
    return req.user;
  },
);
