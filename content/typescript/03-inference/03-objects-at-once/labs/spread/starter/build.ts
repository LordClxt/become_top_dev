// TODO 1 : copie de entity avec un champ id, sans modifier l'original.
export function withId<T extends object>(entity: T, id: string) {
  throw new Error('TODO: withId');
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

// TODO 2 : { text, page } + sort et tags seulement s'ils ont une valeur. Pas de clé à undefined, pas de mutation.
export function buildQuery(text: string, options: QueryOptions = {}): Query {
  const query = {} as Query;
  query.text = text;
  throw new Error('TODO: buildQuery');
}

export interface Contact {
  first: string;
  last: string;
  middle?: string;
  fullName: string;
}

// TODO 3 : middle seulement s'il est non vide ; fullName = "Harry S Truman" (ou "Ada Lovelace").
export function contactCard(first: string, last: string, middle?: string): Contact {
  throw new Error('TODO: contactCard');
}
