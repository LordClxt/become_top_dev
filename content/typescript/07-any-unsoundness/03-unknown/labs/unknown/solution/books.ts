export interface Book {
  title: string;
  author: string;
  year: number;
  tags?: string[];
}

export function parseJSON(text: string): unknown {
  try {
    const value: unknown = JSON.parse(text);
    return value;
  } catch {
    throw new Error('JSON invalide');
  }
}

export function isBook(value: unknown): value is Book {
  return (
    typeof value === 'object' && value !== null &&
    'title' in value && typeof value.title === 'string' && value.title !== '' &&
    'author' in value && typeof value.author === 'string' &&
    'year' in value && typeof value.year === 'number' && Number.isInteger(value.year) &&
    (!('tags' in value) || (Array.isArray(value.tags) && value.tags.every((t) => typeof t === 'string')))
  );
}

export function readBooks(text: string): { books: Book[]; rejected: number } {
  const value = parseJSON(text);
  if (!Array.isArray(value)) throw new Error('un tableau est attendu');
  const books = value.filter(isBook);
  return { books, rejected: value.length - books.length };
}

export function describe(value: unknown): string {
  if (value === null || value === undefined) return 'rien';
  if (isBook(value)) return `livre : ${value.title} (${value.year})`;
  if (Array.isArray(value)) return `liste de ${value.length} élément(s)`;
  if (typeof value === 'string') return `texte : ${value}`;
  if (typeof value === 'number') return `nombre : ${value}`;
  return 'autre';
}
