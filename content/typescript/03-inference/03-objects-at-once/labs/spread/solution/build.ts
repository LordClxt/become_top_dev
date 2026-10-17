export function withId<T extends object>(entity: T, id: string) {
  return { ...entity, id };
}

export type Sort = 'relevance' | 'date';
export interface QueryOptions {
  page?: number;
  sort?: Sort;
  tags?: readonly string[];
}
export interface Query {
  text: string;
  page: number;
  sort?: Sort;
  tags?: readonly string[];
}

export function buildQuery(text: string, options: QueryOptions = {}): Query {
  const { page = 1, sort, tags } = options;
  return {
    text,
    page,
    ...(sort ? { sort } : {}),
    ...(tags && tags.length > 0 ? { tags } : {}),
  };
}

export interface Contact {
  first: string;
  last: string;
  middle?: string;
  fullName: string;
}

export function contactCard(first: string, last: string, middle?: string): Contact {
  return {
    first,
    last,
    ...(middle ? { middle } : {}),
    fullName: [first, middle, last].filter(Boolean).join(' '),
  };
}
