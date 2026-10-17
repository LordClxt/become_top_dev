## Contexte

Une bibliothèque expose des types composés (`Partial<Pick<…>> & Omit<…>`). Ils sont corrects mais illisibles, et les tests de types (qui utilisent `Equals`, strict sur la forme) échouent tant qu'ils ne sont pas aplatis. Tu écris `Resolve` et tu l'appliques.

Tu édites `display.ts`.

## À faire

1. `Resolve<T>` : aplatit un objet, laisse les fonctions intactes.
2. `PartiallyPartial<T, K>` : les clés `K` deviennent optionnelles, le reste inchangé ; résultat aplati ; si `K` est `never`, renvoie `T`.
3. `WithId<T>` : `T` plus `id: string`, aplati.
4. `withDefaults(defaults, overrides)` : fusionne deux objets (les valeurs d'`overrides` l'emportent) ; type de retour `Resolve<Omit<D, keyof O> & O>`.

## Contraintes

Pas de `any`. Une assertion justifiée autorisée dans `withDefaults`.
