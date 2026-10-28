import { Injectable, type NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';

export const Roles = Reflector.createDecorator<string[]>();
const KEYS: Record<string, string[]> = { 'key-staff': ['staff'], 'key-admin': ['staff', 'admin'] };

/** Vérifie la clé et pose les rôles sur la requête. */
@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  use(req: Request & { roles?: string[] }, _res: Response, next: NextFunction): void {
    const roles = KEYS[req.header('x-api-key') ?? ''];
    if (!roles) throw new UnauthorizedException('Clé inconnue');
    req.roles = roles;
    next();
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get(Roles, context.getClass());
    if (!required) return true;
    const roles = context.switchToHttp().getRequest<Request & { roles?: string[] }>().roles ?? [];
    return required.some((r) => roles.includes(r));
  }
}
