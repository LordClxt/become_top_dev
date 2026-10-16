## Contexte

Le code fonctionne, mais chaque `any` désactive le vérificateur : `ageInYears('12', 2024)` passe, et si tu renommes une propriété d'`Item`, aucune erreur ne t'avertira. Tu remplaces chaque `any` par le type exact, **sans changer le comportement**.

Tu édites `inventory.ts`.

## À faire

- Déclare et exporte `interface Item { id: string; label: string }`.
- `ageInYears` : deux nombres → un nombre.
- `longestWord` : liste de chaînes en lecture seule → `string | undefined`.
- `selectItem` : liste d'`Item` en lecture seule et un `id: string` → `Item | undefined` (on ne doit plus pouvoir passer l'objet entier).
- `labels` : liste d'`Item` en lecture seule → `string[]`.

Les paramètres de liste sont `readonly` : ces fonctions ne modifient pas leurs arguments et acceptent donc tableaux ordinaires **et** en lecture seule.

## Contraintes

Aucun `any` ne doit rester. Il ne faut pas modifier les corps des fonctions, sauf si le type précis l'exige.
