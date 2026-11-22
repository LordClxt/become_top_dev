## Contexte

Les changements de phase d'une séance de bourse (`PhaseChange`) étaient rangés dans un tableau indexé par `ordinal()`, écrit quand il n'existait que `PRE_OPEN`, `AUCTION`, `OPEN` et `CLOSED`. L'échange vient d'insérer la phase `HALTED` (suspension) **au milieu** de `SessionPhase` (fourni, à ne pas modifier), et a ajouté trois changements : `HALT` (séance → suspension), `RESUME` (suspension → enchère) et `HALT_AUCTION` (enchère → suspension). Depuis, « enchère → séance » est lu comme « enchère → suspension », et la moitié des changements est introuvable.

Les changements autorisés : `OPEN_AUCTION` (pré-ouverture → enchère), `START_TRADING` (enchère → séance), `CLOSE` (séance → clôture), `HALT`, `RESUME`, `HALT_AUCTION`.

## Ta mission

1. Chaque changement connaît son départ (`from()`) et son arrivée (`to()`).
2. `between(from, to)` retrouve le changement autorisé, ou `Optional.empty()`.
3. `reachableFrom(phase)` renvoie les phases atteignables, dans l'ordre de déclaration.
4. Plus rien ne dépend de la position des constantes : plus aucun `ordinal()` dans `PhaseChange.java`.

Ne modifie que `PhaseChange.java`.
