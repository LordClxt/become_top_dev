const PERMISSIONS = {
  viewer: ['read'],
  editor: ['read', 'write'],
  admin: ['read', 'write', 'delete', 'invite'],
} as const;

// TODO 1 : types déduits de PERMISSIONS (pas recopiés).
//  Role = les rôles ; PermissionOf<R> = les permissions du rôle R (accès indexé + [number]) ;
//  Permission = l'union de toutes les permissions ; Shared<A, B> = permissions communes à A et B (intersection).
export type Role = never;
export type PermissionOf<R extends Role> = never;
export type Permission = never;
export type Shared<A extends Role, B extends Role> = never;

// permissionsOf renvoie les permissions du rôle, avec le type PRÉCIS du rôle donné.
export function permissionsOf<R extends Role>(role: R): readonly PermissionOf<R>[] {
  throw new Error('TODO: permissionsOf');
}

// can : le rôle possède-t-il la permission ? (viewer n'a pas 'write', mais l'appel est bien typé.)
export function can(role: Role, permission: Permission): boolean {
  throw new Error('TODO: can');
}

// minimumRole : le rôle le MOINS puissant qui possède la permission (ordre viewer < editor < admin).
export function minimumRole(permission: Permission): Role {
  throw new Error('TODO: minimumRole');
}

// sharedPermissions : permissions communes aux deux rôles, dans l'ordre des permissions de `a`.
export function sharedPermissions(a: Role, b: Role): Permission[] {
  throw new Error('TODO: sharedPermissions');
}

// missingPermissions : les permissions de l'ensemble total que le rôle n'a pas (différence d'ensembles).
export function missingPermissions(role: Role): Permission[] {
  throw new Error('TODO: missingPermissions');
}
