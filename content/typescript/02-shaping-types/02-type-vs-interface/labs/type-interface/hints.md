## Hint 1
Une interface qui étend une autre ne peut pas redéclarer une propriété avec un type incompatible : supprime la ligne `legs: string`.

## Hint 2
`type Pet = Dog | Cat`. Un tuple nommé : `[lat: number, lng: number]`. Pour distinguer chien et chat dans `describePet`, `'breed' in pet` affine l'union.

## Hint 3
Écris `export interface Settings { theme: 'light' | 'dark' }` puis, plus bas, `export interface Settings { fontSize: number }` : les deux déclarations sont fusionnées. `Math.hypot` calcule la distance.
