## Hint 1
`Gatherer.ofSequential(initialiseur, intégrateur, finisseur)`. L'état (paquet en cours, somme) vient de l'**initialiseur**, appelé une fois par exécution du stream : une classe locale `class Batch { … }` et `Batch::new`. Jamais de champ ou de variable capturée pour l'état.

## Hint 2
Dans l'intégrateur de `byNotional`, si le paquet n'est pas vide et que l'ajout dépasse la limite, `downstream.push(List.copyOf(paquet))` puis vide le paquet. Le finisseur pousse ce qui reste. Pour `untilExposure`, l'intégrateur renvoie `false` dès que le cumul dépasserait le plafond : c'est ainsi qu'un gatherer arrête le stream.

## Hint 3
`movingAverages` : `prices.stream().gather(Gatherers.windowSliding(window))` émet une fenêtre incomplète quand il y a moins de `window` éléments ; filtre `w.size() == window`, puis `w.stream().mapToLong(Long::longValue).sum() / window`. `runningExposure` : `Gatherers.scan(() -> 0L, (acc, t) -> acc + t.notional())`. Termine chaque stream par `toList()`.
