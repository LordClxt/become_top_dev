export type RequestState =
  | { state: 'pending' }
  | { state: 'error'; error: string }
  | { state: 'ok'; pageText: string };

export interface State {
  readonly currentPage: string;
  readonly requests: Readonly<Record<string, RequestState>>;
}

export const initialState: State = { currentPage: 'Accueil', requests: {} };

function withRequest(state: State, page: string, request: RequestState): State {
  return { ...state, requests: { ...state.requests, [page]: request } };
}

export function navigate(state: State, page: string): State {
  const moved = { ...state, currentPage: page };
  const request = state.requests[page];
  if (request === undefined || request.state === 'error') return withRequest(moved, page, { state: 'pending' });
  return moved;
}

export function succeeded(state: State, page: string, text: string): State {
  return withRequest(state, page, { state: 'ok', pageText: text });
}

export function failed(state: State, page: string, error: string): State {
  return withRequest(state, page, { state: 'error', error });
}

export function render(state: State): string {
  const { currentPage } = state;
  const request = state.requests[currentPage];
  if (request === undefined) return `${currentPage} : rien à afficher`;
  switch (request.state) {
    case 'pending': return `Chargement de ${currentPage}…`;
    case 'error': return `Erreur sur ${currentPage} : ${request.error}`;
    case 'ok': return `<h1>${currentPage}</h1>\n${request.pageText}`;
  }
}

export function pagesToFetch(state: State): string[] {
  return Object.entries(state.requests)
    .filter(([, request]) => request.state === 'pending')
    .map(([page]) => page)
    .sort();
}
