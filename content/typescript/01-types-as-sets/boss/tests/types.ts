import type { Equals, Expect } from './expect.ts';
import { can, minimumRole, missingPermissions, permissionsOf, sharedPermissions } from './access.ts';
import type { Permission, PermissionOf, Role, Shared } from './access.ts';

export type Checks = [
  Expect<Equals<Role, 'viewer' | 'editor' | 'admin'>>,
  Expect<Equals<PermissionOf<'viewer'>, 'read'>>,
  Expect<Equals<PermissionOf<'editor'>, 'read' | 'write'>>,
  Expect<Equals<Permission, 'read' | 'write' | 'delete' | 'invite'>>,
  Expect<Equals<Shared<'viewer', 'editor'>, 'read'>>,
  Expect<Equals<Shared<'editor', 'admin'>, 'read' | 'write'>>,
  Expect<Equals<ReturnType<typeof permissionsOf<'editor'>>, readonly ('read' | 'write')[]>>,
  Expect<Equals<ReturnType<typeof minimumRole>, Role>>,
];

export const ok: PermissionOf<'editor'> = 'write';
can('viewer', 'delete');

// @ts-expect-error un viewer ne peut pas avoir 'write' : l'ensemble de ses permissions est {'read'}
export const bad: PermissionOf<'viewer'> = 'write';
// @ts-expect-error 'guest' n'est pas un rôle
can('guest', 'read');
// @ts-expect-error 'execute' n'est pas une permission
can('admin', 'execute');
export type Impossible = Shared<'viewer', 'viewer'>;
