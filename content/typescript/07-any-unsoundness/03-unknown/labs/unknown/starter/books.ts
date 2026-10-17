export interface Book {
  title: string;
  author: string;
  year: number;
  tags?: string[];
}

// TODO 1 : unknown, pas any.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseJSON(text: string): any {
  return JSON.parse(text);
}

// À supprimer : une assertion déguisée.
export function load<T>(text: string): T {
  return parseJSON(text);
}

// TODO 2 : un type guard.
export function isBook(value: unknown): boolean {
  throw new Error('TODO: isBook');
}

// TODO 3
export function readBooks(text: string): { books: Book[]; rejected: number } {
  throw new Error('TODO: readBooks');
}

// TODO 4
export function describe(value: unknown): string {
  throw new Error('TODO: describe');
}
