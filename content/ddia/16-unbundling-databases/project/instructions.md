## Contexte

Tinybase a un log de changements : chaque `Event` dit qu'un document `Key` a été écrit (`Doc`) ou supprimé (`Deleted`), à un `Offset` strictement croissant. Tu construis ce que le chapitre appelle une base **dégroupée** : des vues **dérivées** de ce log, maintenues par des fonctions déterministes et idempotentes, qu'on peut jeter et reconstruire, et qu'on peut remplacer sans interruption. Les types, l'interface `View`, `Field` et les erreurs sont fournis.

## Règles communes à toutes les vues
- `Offset <= 0` : `ErrBadOffset` ; clé vide : `ErrEmptyKey`. Un événement invalide ne modifie rien.
- Un événement dont l'offset est **inférieur ou égal** à `Offset()` est ignoré et `Apply` renvoie `nil` : c'est l'idempotence qui rend la livraison « au moins une fois » sans danger.
- Un document qui change de valeur **quitte** son ancienne entrée ; un document supprimé, ou qui perd le champ, sort de la vue.

## Jalon 1 — L'index secondaire
`NewIndex(field)`, `Apply`, `Offset`, et `Lookup(value)` qui renvoie les clés **triées**, dans une copie (vide si aucune).
Exemple : `a=Lyon`, `b=Lyon`, puis `a=Paris` ⇒ `Lookup("Lyon") = [b]`, `Lookup("Paris") = [a]`.

## Jalon 2 — Compteurs et reconstruction
- `NewCounter(key KeyFunc)` compte les documents vivants par groupe ; `Count(g)` et `Counts()` (copie, sans groupe à 0). `KeyFunc` est la **fonction de dérivation** : `Field("city")` ou ton propre code (normalisation…).
- `CatchUp(v, log)` applique à `v` les événements plus récents que `v.Offset()` et renvoie leur nombre. Un log non strictement croissant est refusé (`ErrOutOfOrder`) **avant** toute application.
- Le test clé : un état construit au fil de l'eau, avec des lots relivrés, doit être **identique** à une reconstruction depuis zéro.

## Jalon 3 — Deux vues en parallèle, puis bascule
`NewMigration(old, next)` :
- `Current()` renvoie `old` tant que la bascule n'a pas eu lieu, `next` ensuite ;
- `Apply(ev)` : l'ancienne vue reçoit l'événement tant qu'elle n'est pas retirée ; la nouvelle le reçoit **seulement si elle a rattrapé** l'ancienne (`Ready()`), sinon elle le relira dans le log ;
- `Backfill(log)` fait rattraper la nouvelle vue ; `Ready()` vaut vrai quand `next.Offset() >= old.Offset()` ;
- `Switch()` (sinon `ErrNotCaughtUp`), `Rollback()` (sinon `ErrRetired`), `Retire()` (seulement après la bascule, sinon `ErrNotSwitched`) ; une vue retirée n'est plus maintenue.

## Exemple
L'ancienne vue compte les clients **par ville** et sert les lectures. On crée la vue **par pays**, on la fait rattraper sur le log pendant que le flux continue, on bascule, on revient en arrière parce qu'un chiffre surprend, on rebascule, puis on retire l'ancienne. À la fin, la vue par pays est exactement celle qu'on obtiendrait en relisant tout le log.
