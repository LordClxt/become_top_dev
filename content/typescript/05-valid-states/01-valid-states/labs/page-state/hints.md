## Hint 1
`type RequestState = { state: 'pending' } | { state: 'error'; error: string } | { state: 'ok'; pageText: string };`

## Hint 2
Pour mettre à jour une case : `{ ...state, requests: { ...state.requests, [page]: { state: 'ok', pageText: text } } }`.

## Hint 3
`render` : lis `state.requests[state.currentPage]`, teste `undefined`, puis `switch (request.state)`.
