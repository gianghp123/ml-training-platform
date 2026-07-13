import { getAuth } from "@clerk/express";
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/role.decorator";
import { UserRole } from "src/libs/enums/user-role.enum";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) { }

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<UserRole[]>(
        ROLES_KEY,
        [
          ctx.getHandler(),
          ctx.getClass(),
        ],
      );

    if (!requiredRoles?.length) {
      return true;
    }

    const req = ctx.switchToHttp().getRequest();

    const { sessionClaims } = getAuth(req);

    if (!requiredRoles.includes(
      sessionClaims.role || UserRole.User,
    )) {
      throw new ForbiddenException();
    }

    return true;
  }
}
