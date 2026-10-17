## Hint 1
`let minMax: [number, number] | null = null;` puis, dans la boucle, `minMax = minMax ? [Math.min(...), Math.max(...)] : [num, num];`.

## Hint 2
`static async load(userId: string, api: Api): Promise<Profile> { const [user, posts] = await Promise.all([...]); return new Profile(user, posts); }`.

## Hint 3
`latestTitle` : `this.posts.toSorted((a, b) => b.publishedAt - a.publishedAt)[0]?.title ?? null`.
