## Hint 1
`Reflect.defineMetadata(clé, valeur, cible)` et `Reflect.getMetadata(clé, cible)` viennent de `reflect-metadata`. Un décorateur de classe est une fonction `(target) => void` : `Injectable()` renvoie une telle fonction.

## Hint 2
Garde une `Map<Function, unknown>` des instances déjà créées. Dans `resolve`, regarde d'abord la Map. Ensuite vérifie le marqueur, puis lis `Reflect.getMetadata('design:paramtypes', cls) ?? []`.

## Hint 3
Parcours les paramtypes avec leur index : `undefined` donne une erreur « … index [i] … undefined », `Object` donne une erreur « … index [i] … Object ». Pour les autres, appelle `this.resolve(dep)`. Termine par `new cls(...deps)` et range l'instance dans la Map avant de la renvoyer.
