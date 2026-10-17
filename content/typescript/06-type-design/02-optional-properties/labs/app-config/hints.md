## Hint 1
`export type AppConfig = Required<InputAppConfig>;`

## Hint 2
`{ unitSystem: input.unitSystem ?? DEFAULTS.unitSystem, … }` : `??` traite `undefined` explicite comme une absence (une décomposition `{ ...DEFAULTS, ...input }` ne le ferait pas).

## Hint 3
`(miles * KM_PER_MILE).toFixed(config.decimals)`.
