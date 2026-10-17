## Hint 1
```ts
type Leaf = string | number | boolean | null | undefined | Date | readonly unknown[];
type Paths<T> = T extends Leaf ? never : {
  [K in keyof T & string]: K | `${K}.${Paths<T[K]>}`
}[keyof T & string];
```

## Hint 2
`PathValue<T, P>` : `P extends \`${infer Head}.${infer Rest}\`` ? (Head extends keyof T ? PathValue<T[Head], Rest> : never) : (P extends keyof T ? T[P] : never)`.

## Hint 3
Le nom du handler à l'exécution : `` `on${event.charAt(0).toUpperCase()}${event.slice(1)}` ``.
