## Hint 1
Un pipe reçoit la sortie du précédent : `BookByIsbnPipe` reçoit déjà `978-2253004226`, jamais la saisie brute.

## Hint 2
Pour la clé : `[...digits].reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0) % 10 === 0`.

## Hint 3
`BookByIsbnPipe` est `@Injectable()` : `constructor(private readonly books: BooksService) {}`.
