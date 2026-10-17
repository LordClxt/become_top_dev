export interface User {
  name: string;
}

declare global {
  /** L'utilisateur connecté ; undefined avant login() ou après logout(). */
  var currentUser: User | undefined;
}

export function login(user: User): void {
  globalThis.currentUser = user;
}

export function logout(): void {
  globalThis.currentUser = undefined;
}

export function whoAmI(): string {
  return globalThis.currentUser?.name ?? 'anonyme';
}

/** Les infobulles sont associées aux objets sans les modifier. */
const tooltips = new WeakMap<object, string>();

export function setTooltip(target: object, text: string): void {
  tooltips.set(target, text);
}

export function getTooltip(target: object): string | undefined {
  return tooltips.get(target);
}

export function tooltipCount(targets: readonly object[]): number {
  return targets.filter((t) => tooltips.has(t)).length;
}
