## Hint 1
`@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number`. L'ordre compte : la valeur par défaut d'abord, la conversion ensuite. Les bornes sont une règle à vérifier toi-même avec `BadRequestException`.

## Hint 2
`@Param('id', ParseIntPipe) id: number` donne 400 pour `abc`. Pour le filtre, compare `author.toLowerCase().includes(q.toLowerCase())`. Pour la page, `slice((page - 1) * limit, page * limit)`.

## Hint 3
`z.object({ title: z.string().min(1), author: z.string().min(1), year: z.number().int().min(1450).max(2100) })`, puis `@Body({ schema: CreateBook }) body: CreateBook`. Zod supprime les clés inconnues, et le pipe transmet la valeur produite par le schéma.
