---
id: go-ch05-l05
title: "Régler le ramasse-miettes : GOGC et GOMEMLIMIT"
source: { chapter: 6, pages: "163-165" }
duration_min: 20
concepts:
  - id: go-gogc
    label: "GOGC : la taille du tas qui déclenche le prochain cycle de GC"
  - id: go-gomemlimit
    label: "GOMEMLIMIT : un plafond mémoire souple"
  - id: go-gc-thrashing
    label: "Le thrashing du GC et l'intérêt de combiner les deux réglages"
glossary:
  - term: "GOGC"
    definition: "Variable d'environnement (100 par défaut) qui règle de combien le tas peut grandir avant le prochain cycle de GC, en pourcentage du tas vivant."
  - term: "GOMEMLIMIT"
    definition: "Variable d'environnement qui fixe une limite souple de mémoire totale pour le programme, en octets ou avec un suffixe (KiB, MiB, GiB, TiB)."
  - term: "thrashing"
    definition: "Situation où le GC tourne presque en permanence parce que le programme frôle sa limite mémoire, et ne fait plus rien d'autre."
  - term: "tas vivant"
    definition: "Partie du tas encore référencée, donc non récupérable."
visuals: [go-ch05-gogc]
labs: [go-ch05-l05-lab-gctune]
xp: 25
---

## Pourquoi c'est important

Dans la plupart des programmes, tu n'as jamais besoin de toucher au ramasse-miettes. Mais le jour où un service tourne dans un conteneur limité à 512 Mo, ou où ses temps de réponse deviennent irréguliers, ces deux variables d'environnement sont les premiers boutons à connaître. Elles montrent aussi un compromis universel : **mémoire contre temps de calcul**.

## Le GC ne libère pas immédiatement

Libérer la mémoire dès qu'une donnée n'est plus référencée serait trop coûteux. Le GC laisse donc les déchets s'accumuler un peu : le tas contient presque toujours des données vivantes et de la mémoire inutile. Deux réglages contrôlent sa taille.

## `GOGC` : quand lancer le prochain cycle ?

À la fin d'un cycle, le GC mesure le tas et calcule la taille qui déclenchera le suivant :

```
prochain déclenchement = TAS_ACTUEL + TAS_ACTUEL × GOGC / 100
```

Avec la valeur par défaut `GOGC=100`, le prochain cycle démarre quand le tas atteint **le double** de sa taille après le cycle précédent. Un tas vivant de 200 Mo déclenche le suivant à 400 Mo.

::visual{id="go-ch05-gogc"}

- **Réduire** `GOGC` (50) : le GC passe plus souvent, la mémoire reste plus basse, le processeur travaille plus.
- **Augmenter** `GOGC` (200) : le GC passe moins souvent, la mémoire monte plus haut. En gros, **doubler `GOGC` divise par deux le temps de processeur passé en GC**.
- **`GOGC=off`** désactive le GC. Le programme tourne plus vite, mais sur un processus long il finira par consommer toute la mémoire de la machine. Peu recommandé tel quel.

(Le calcul réel tient aussi compte des piles des goroutines et des variables de package ; le plus souvent, le tas domine.)

## `GOMEMLIMIT` : un plafond de mémoire

`GOMEMLIMIT` fixe la mémoire totale que le programme est autorisé à utiliser, comme `-Xmx` en Java. Désactivée par défaut, elle se donne en octets, avec éventuellement les suffixes `B`, `KiB`, `MiB`, `GiB` ou `TiB` :

```bash
GOMEMLIMIT=3GiB ./relay    # 3 gibioctets = 3 221 225 472 octets
```

> **KiB, MiB, GiB** sont les unités en puissances de deux (1 KiB = 2¹⁰ octets). Pour la mémoire, ce sont les noms corrects ; KB, MB et GB désignent en toute rigueur des puissances de dix.

Pourquoi limiter la mémoire améliorerait-il les performances ? Parce qu'une machine, une VM ou un conteneur n'a pas de RAM infinie. Avec seulement `GOGC`, un pic de mémoire temporaire peut faire dépasser le tas de la RAM disponible : le système bascule alors sur le disque (swap, très lent) ou tue le processus. Une limite empêche le tas de grandir au-delà.

### C'est une limite souple

`GOMEMLIMIT` peut être dépassée dans certaines circonstances. Si le programme frôle sans cesse la limite, le GC se déclenche en boucle sans pouvoir libérer assez : c'est le **thrashing**. Le programme ne fait alors plus que du ramasse-miettes. Quand le runtime détecte ce début, il préfère terminer le cycle en cours et **dépasser** la limite.

Conséquence : fixe `GOMEMLIMIT` **en dessous** de la mémoire réellement disponible, pour garder de la marge (par exemple 90 % de celle du conteneur).

## Les combiner

Techniquement, tu peux mettre `GOGC=off` et compter sur `GOMEMLIMIT` seul pour ne pas manquer de mémoire. Mais tu échanges alors des pauses **fréquentes et très courtes** contre des pauses **rares et longues**. Pour un service web, c'est des temps de réponse irréguliers : exactement ce que le GC de Go cherche à éviter.

La meilleure option : **les deux ensemble**. `GOGC` donne un rythme raisonnable au GC ; `GOMEMLIMIT` impose un maximum qui sera respecté. Le Guide officiel du ramasse-miettes de Go (« A Guide to the Go Garbage Collector ») détaille tout cela.

## Pièges fréquents

- **Désactiver le GC** sur un processus qui tourne longtemps.
- **Fixer `GOMEMLIMIT` à 100 % de la mémoire du conteneur** : aucune marge, risque de thrashing.
- **Régler avant de mesurer** : `GODEBUG=gctrace=1` affiche chaque cycle du GC, et les profils (`pprof`) montrent où part la mémoire.
- **Confondre KB et KiB** quand tu écris `GOMEMLIMIT`.

## À retenir

- `GOGC` (100 par défaut) fixe le prochain déclenchement à `tas + tas × GOGC/100`. Plus haut = moins de GC, plus de mémoire.
- `GOMEMLIMIT` plafonne la mémoire totale ; elle est souple, et se règle sous la limite réelle de la machine.
- Thrashing : le GC ne fait plus que tourner. Il est évité en gardant de la marge.
- Le meilleur réglage combine les deux : un rythme raisonnable et un maximum respecté.
- Mesure d'abord (`gctrace`, profils), règle ensuite.
