import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { getAuth } from '@clerk/express';
import { UserRole } from 'src/libs/enums/user-role.enum';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();

    const auth = getAuth(req);

    return {
      userId: auth.userId!,
      role: auth.sessionClaims.role ?? UserRole.User,
    };
  },
);
