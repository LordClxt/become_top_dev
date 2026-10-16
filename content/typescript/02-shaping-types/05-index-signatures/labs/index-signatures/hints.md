## Hint 1
Une `Map<string, string>` se lit avec `.get(clé)`, qui renvoie `string | undefined` : TypeScript t'oblige à traiter l'absence. Pour construire une Map depuis des paires : `new Map(headers.map((h, i) => [h, cells[i]]))` (annote les paires comme tuples `[string, string]`).

## Hint 2
`Record<'x' | 'y' | 'z', number>` impose exactement ces trois clés. `Iterable<number>` se parcourt avec `for…of`. `ArrayLike<T>` garantit `length` et `xs[0]`.

## Hint 3
Pour `parseCSV`, sépare les lignes, filtre les vides après `trim`, extrais la première comme en-têtes. `cells[i]!` est justifié : tu as vérifié que la longueur correspond.
