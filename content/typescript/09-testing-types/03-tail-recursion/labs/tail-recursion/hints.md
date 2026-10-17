## Hint 1
`type GetCharsHelp<S extends string, Acc> = S extends \`${infer F}${infer R}\` ? GetCharsHelp<R, Acc | F> : Acc;`

## Hint 2
`type LengthHelp<S extends string, Acc extends unknown[]> = S extends \`${string}${infer R}\` ? LengthHelp<R, [...Acc, 0]> : Acc['length'];`

## Hint 3
`toSnake` : `s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())`.
