import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Gets the decoded JWT payload from req.user (set by JwtStrategy).
 * Example payload: { sub: userId, email, role }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
