const PERMISSIONS = {
  viewer: ['read'],
  editor: ['read', 'write'],
  admin: ['read', 'write', 'delete', 'invite'],
} as const;

/** Les rôles, du moins puissant au plus puissant. */
export type Role = keyof typeof PERMISSIONS;
/** Permissions d'un rôle précis (sous-ensemble des permissions). */
export type PermissionOf<R extends Role> = (typeof PERMISSIONS)[R][number];
/** Toutes les permissions existantes : l'union des permissions de tous les rôles. */
export type Permission = PermissionOf<Role>;
/** Permissions communes à deux rôles : l'intersection des deux ensembles. */
export type Shared<A extends Role, B extends Role> = PermissionOf<A> & PermissionOf<B>;

const ORDER: readonly Role[] = ['viewer', 'editor', 'admin'];

export function permissionsOf<R extends Role>(role: R): readonly PermissionOf<R>[] {
  return PERMISSIONS[role];
}

export function can(role: Role, permission: Permission): boolean {
  const granted: readonly Permission[] = PERMISSIONS[role];
  return granted.includes(permission);
}

/** Le rôle le moins puissant qui possède cette permission. */
export function minimumRole(permission: Permission): Role {
  const role = ORDER.find((candidate) => can(candidate, permission));
  if (role === undefined) throw new Error(`permission inconnue : ${permission}`);
  return role;
}

/** Permissions communes, dans l'ordre de `a`. */
export function sharedPermissions(a: Role, b: Role): Permission[] {
  return PERMISSIONS[a].filter((permission): permission is Permission => can(b, permission));
}

/** Les permissions que `role` n'a pas : la différence d'ensembles. */
export function missingPermissions(role: Role): Permission[] {
  const all: readonly Permission[] = PERMISSIONS.admin;
  return all.filter((permission) => !can(role, permission));
}
