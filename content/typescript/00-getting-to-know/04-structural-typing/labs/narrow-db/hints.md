## Hint 1
Pour `length`, demande-toi comment savoir, **à l'exécution**, si l'objet a un `z`. Un type ne peut pas répondre, une propriété si.

## Hint 2
`'z' in v` répond à l'exécution et affine aussi le type dans la branche vraie. Pour `QueryRunner`, écris uniquement ce que `getAuthors` appelle : la signature de `runQuery`.

## Hint 3
`runQuery(sql: string, params: readonly unknown[]): Promise<readonly { name: unknown }[]>` suffit. Après le `await`, transforme les lignes avec `map` puis trie avec `localeCompare`.
