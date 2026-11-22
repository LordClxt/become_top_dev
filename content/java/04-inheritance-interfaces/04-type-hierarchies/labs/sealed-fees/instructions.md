## Contexte

Les frais de courtage d'Ordo sont calculés par `Fee`, une classe à étiquette : un champ `kind`, quatre champs dont la plupart ne servent pas, et un `switch`. Depuis l'ajout des frais par paliers, les gros ordres ne paient plus rien. Et rien ne refuse un pourcentage négatif.

L'API publique ne change pas : `Fee.flat(cents)`, `Fee.percent(basisPoints)`, `Fee.tiered(threshold, below, above)` et `fee.on(notional)` (en centimes, arrondi vers le bas ; 1 point de base = 0,01 %). Pour les paliers : `below` points de base jusqu'au seuil **inclus**, puis `above` sur la part au-delà.

## Ta mission

1. Les trois sortes calculent juste.
2. Chaque sorte refuse ses données invalides (`IllegalArgumentException`) : forfait négatif, points de base hors de [0, 10 000], seuil ≤ 0.
3. Deux frais de même sorte et mêmes valeurs sont égaux.
4. `Fee` devient une **interface scellée** dont chaque sorte est un **record** : la prochaine sorte ajoutée ne pourra plus être oubliée en silence.

Ne modifie que `Fee.java`.
