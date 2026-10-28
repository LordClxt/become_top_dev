import {
  type CanActivate, type ExecutionContext, Injectable,
} from '@nestjs/common';

// Décorateurs de métadonnées et de paramètre : à écrire (voir instructions.md).
export const Public = (): MethodDecorator & ClassDecorator => () => {};
export const Roles = (_roles: string[]): MethodDecorator & ClassDecorator => () => {};
export const Auth = (..._roles: string[]): MethodDecorator & ClassDecorator => () => {};
export const CurrentUser = (_field?: string): ParameterDecorator => () => {};

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    throw new Error('TODO');
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    throw new Error('TODO');
  }
}
