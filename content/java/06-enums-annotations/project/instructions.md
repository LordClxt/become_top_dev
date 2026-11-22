## Où on en est

Ordo a ses ordres, ses transactions et son bus d'événements typé (jalons 1 à 5, repris tels quels). Il manque le **cycle de vie** : savoir où en est chaque ordre. Le statut `OrderStatus` existe, mais sa table de transitions est un tableau indexé par `ordinal()`, écrit avant l'arrivée de `REJECTED` : tout a glissé d'un cran.

Les transitions voulues :

| Depuis | Vers |
|---|---|
| NEW | ACCEPTED, REJECTED |
| ACCEPTED | PARTIALLY_FILLED, FILLED, CANCELLED |
| PARTIALLY_FILLED | PARTIALLY_FILLED, FILLED, CANCELLED |
| REJECTED, FILLED, CANCELLED | aucune (statuts finaux) |

## M1 — Des transitions qui ne glissent plus

- `next()` renvoie les statuts atteignables, dans l'ordre de déclaration, dans un ensemble **non modifiable** ; `canMoveTo(target)` et `isTerminal()` s'en déduisent.
- Plus aucune position : chaque transition dit d'où elle part et où elle va, et la table est **construite** à partir d'elles.

## M2 — Suivre les ordres depuis le bus

- `new OrderTracker(bus)` s'abonne au bus. Un ordre jamais vu est `NEW`.
- `Accepted` mène à `ACCEPTED` ; `Filled` mène à `FILLED` si l'ordre porté par l'événement (l'ordre **après** l'exécution) est entièrement exécuté, à `PARTIALLY_FILLED` sinon ; `Cancelled` mène à `CANCELLED`.
- Une transition impossible ne change rien, et s'ajoute à `anomalies()` sous la forme `"b-1: FILLED -> CANCELLED"`.
- `status(id)` : le statut actuel, vide pour un ordre jamais vu (une exécution refusée ne crée pas l'ordre).
- `countByStatus()` : **tous** les statuts (à 0 s'il le faut), dans l'ordre de déclaration.

## M3 — Des contrôles extensibles

`OrderCheck` (fourni) est l'interface d'un contrôle ; Ordo livre l'enum `StandardCheck`, et chaque desk écrit le sien.

- `requireAll(Class<T>)` exige toutes les constantes d'un enum de contrôles ; le compilateur refuse une classe qui n'est pas un enum de `OrderCheck`.
- `require(Collection<? extends OrderCheck>)` exige des contrôles pris dans un ou plusieurs enums.
- À l'acceptation, un ordre qui échoue à au moins un contrôle passe à `REJECTED` ; `rejections(id)` donne les contrôles échoués, dans l'ordre où ils ont été exigés.
- Tes deux fichiers compilent avec `-Xlint:all -Werror`.

Ne modifie que `OrderStatus.java` et `OrderTracker.java`.
