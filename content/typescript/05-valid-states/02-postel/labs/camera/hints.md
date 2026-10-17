## Hint 1
`export interface CameraOptions extends Omit<Partial<Camera>, 'center'> { center?: LngLatLike }`.

## Hint 2
`toLngLat` : teste `'lng' in like`, puis `'lon' in like` ; il reste le tuple. (`Array.isArray` ne rétrécit pas un tuple `readonly` : piège connu.)

## Hint 3
`applyOptions` : `const { center, ...rest } = options; return { ...camera, ...rest, ...(center ? { center: toLngLat(center) } : {}) };` — attention, une option `undefined` explicite ne doit pas écraser une valeur : filtre-les.
