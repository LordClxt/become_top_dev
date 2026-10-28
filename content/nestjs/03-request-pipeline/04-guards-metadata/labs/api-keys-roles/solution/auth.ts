import {
  applyDecorators, type CanActivate, createParamDecorator, type ExecutionContext, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { API_KEYS, type User } from './users.js';

/** Route accessible sans clé. */
export const Public = Reflector.createDecorator<boolean>({ transform: () => true });
/** Rôles exigés ; la méthode remplace la classe. */
export const Roles = Reflector.createDecorator<string[]>();
/** Raccourci : authentifié avec l'un des rôles donnés. */
export const Auth = (...roles: string[]) => applyDecorators(Roles(roles));

type AuthedRequest = Request & { user?: User };

/** L'utilisateur courant, ou l'un de ses champs. */
export const CurrentUser = createParamDecorator((field: keyof User | undefined, ctx: ExecutionContext) => {
  const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
  return field ? user?.[field] : user;
});

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride(Public, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const user = API_KEYS[request.header('x-api-key') ?? ''];
    if (!user) throw new UnauthorizedException('Clé d\'API absente ou inconnue');
    request.user = user;
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (this.reflector.getAllAndOverride(Public, [context.getHandler(), context.getClass()])) return true;
    const roles = this.reflector.getAllAndOverride(Roles, [context.getHandler(), context.getClass()]);
    if (!roles || roles.length === 0) return true;
    const user = context.switchToHttp().getRequest<AuthedRequest>().user;
    return !!user && roles.some((r) => user.roles.includes(r));
  }
}
