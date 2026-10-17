export interface User {
  name: string;
}

// TODO 1 : augmente le type global (declare global { var currentUser: … }), puis plus de `as any`.
export function login(user: User): void {
  (globalThis as any).currentUser = user;
}

export function logout(): void {
  (globalThis as any).currentUser = undefined;
}

export function whoAmI(): string {
  throw new Error('TODO: whoAmI');
}

// TODO 2 : une WeakMap plutôt que du monkey patching.
export function setTooltip(target: object, text: string): void {
  (target as any).__tooltip = text;
}

export function getTooltip(target: object) {
  return (target as any).__tooltip;
}

// TODO 3
export function tooltipCount(targets: readonly object[]): number {
  throw new Error('TODO: tooltipCount');
}
