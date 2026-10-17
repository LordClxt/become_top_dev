## Hint 1
```ts
export function double<T extends string | number>(x: T): T extends string ? string : number;
export function double(x: string | number): string | number { … }
```

## Hint 2
`type Convert<K extends 'int' | 'bool' | 'text'> = K extends 'int' ? number : K extends 'bool' ? boolean : string;`

## Hint 3
`firstOrSelf` : l'implémentation prend `unknown` et renvoie `unknown` ; `Array.isArray(x) ? x[0] : x`.
