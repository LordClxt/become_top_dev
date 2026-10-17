// TODO 1 : une union taguée sur `state` : pending | error (error) | ok (pageText).
export type RequestState = { state: string; error?: string; pageText?: string };

export interface State {
  readonly currentPage: string;
  readonly requests: Readonly<Record<string, RequestState>>;
}

export const initialState: State = { currentPage: 'Accueil', requests: {} };

// TODO 2 : page courante ; pending si jamais demandée ou en erreur ; sinon inchangée.
export function navigate(state: State, page: string): State {
  throw new Error('TODO: navigate');
}

// TODO 3 : ne met à jour QUE la requête de `page`.
export function succeeded(state: State, page: string, text: string): State {
  throw new Error('TODO: succeeded');
}

export function failed(state: State, page: string, error: string): State {
  throw new Error('TODO: failed');
}

// TODO 4 : un switch sur l'état de la page courante.
export function render(state: State): string {
  throw new Error('TODO: render');
}

// TODO 5 : les pages en attente, triées.
export function pagesToFetch(state: State): string[] {
  throw new Error('TODO: pagesToFetch');
}
