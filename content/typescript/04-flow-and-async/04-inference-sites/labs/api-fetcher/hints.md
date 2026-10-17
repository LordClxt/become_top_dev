## Hint 1
`class ApiFetcher<API> { readonly base: string; private readonly calls: string[] = []; constructor(base: string) { this.base = base; } … }`

## Hint 2
`async fetch<Path extends keyof API & string>(path: Path): Promise<API[Path]> { this.calls.push(this.base + path); return (await rawFetch(path)) as API[Path]; }`

## Hint 3
`fetchMany` : `Promise.all(paths.map((p) => fetcher.fetch(p)))`. Son type de retour peut rester `Promise<API[Path][]>`.
