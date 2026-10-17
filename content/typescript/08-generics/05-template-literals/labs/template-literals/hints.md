## Hint 1
`[key: \`data-${string}\`]: string | number;`

## Hint 2
`type ObjectToCamel<T extends object> = { [K in keyof T as ToCamel<K & string>]: T[K] };` et à l'exécution `s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())`.

## Hint 3
`RouteParams` : deux cas, `` P extends `${string}:${infer Param}/${infer Rest}` `` (un paramètre puis la suite) et `` P extends `${string}:${infer Param}` `` (le dernier). Pour fusionner, un type mappé sur `Param | keyof RouteParams<Rest>`.
