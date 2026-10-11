---
id: ddia-ch02-l04
title: "B-trees contre LSM-trees : amplification et compromis"
source: { chapter: 3, pages: "83-85" }
duration_min: 30
concepts:
  - id: ddia-write-amplification
    label: "Amplification en écriture : une écriture logique devient plusieurs écritures disque"
  - id: ddia-lsm-advantages
    label: "Atouts des LSM : débit d'écriture, compression, peu de fragmentation"
  - id: ddia-compaction-interference
    label: "Inconvénient des LSM : la compaction perturbe les percentiles élevés et peut ne pas suivre"
  - id: ddia-btree-single-copy
    label: "Atout des B-trees : une clé à un seul endroit, utile aux transactions"
  - id: ddia-measure-workload
    label: "Pas de règle universelle : mesurer avec sa propre charge"
glossary:
  - term: "amplification en écriture (write amplification)"
    definition: "Une écriture dans la base provoque plusieurs écritures sur disque au fil de la vie des données (WAL, pages, compactions). Rapport octets écrits sur disque / octets écrits par l'application."
  - term: "débit d'écriture"
    definition: "Nombre d'écritures par seconde qu'un moteur soutient avec la bande passante disque disponible."
  - term: "fragmentation"
    definition: "Espace inutilisé dans les pages d'un B-tree après des éclatements ou quand une ligne ne tient pas dans une page."
visuals: []
labs: [ddia-ch02-l04-lab-write-amp-design]
xp: 30
---

## Pourquoi c'est important

« LSM pour écrire, B-tree pour lire. » La formule est exacte comme règle de pouce, mais dangereuse si tu la prends pour un théorème. Cette leçon donne les mécanismes derrière la règle, donc les situations où elle se renverse.

## La règle de pouce, et son avertissement

Les LSM-trees sont généralement plus **rapides en écriture**, les B-trees réputés plus rapides en **lecture** : les lectures sont plus lentes sur un LSM parce qu'il faut consulter plusieurs structures et SSTables à différents stades de compaction. Mais les benchmarks sont souvent peu concluants et sensibles aux détails de la charge. **Il faut tester avec ta propre charge.**

## Atouts des LSM-trees

### Moins d'amplification en écriture (parfois)

Un B-tree écrit chaque donnée **au moins deux fois** : une fois dans le WAL, une fois dans la page de l'arbre (et peut-être de nouveau à chaque éclatement). Il y a aussi le surcoût d'écrire une **page entière** même si quelques octets seulement ont changé. Certains moteurs écrasent même deux fois la même page pour éviter une page à moitié mise à jour en cas de coupure de courant.

Les index log-structurés réécrivent eux aussi les données à cause des compactions et fusions répétées. Cet effet (une écriture dans la base qui provoque plusieurs écritures disque pendant sa vie) est l'**amplification en écriture**. Elle préoccupe surtout les **SSD**, qui ne supportent qu'un nombre limité de réécritures. Dans une application qui écrit beaucoup, le goulot est le débit d'écriture du disque : plus le moteur écrit, moins d'écritures par seconde il tient.

Les LSM-trees soutiennent en général un **meilleur débit d'écriture**, en partie grâce à une amplification parfois plus faible (selon le moteur et la charge), en partie parce qu'ils écrivent séquentiellement de compacts fichiers SSTable au lieu d'écraser plusieurs pages. Cela compte beaucoup sur disque magnétique.

### Mieux compressés, moins fragmentés

Les LSM-trees se compressent mieux et produisent des fichiers plus petits. Un B-tree laisse de l'espace inutilisé (**fragmentation**) à chaque éclatement ou quand une ligne ne tient pas dans une page. Un LSM n'est pas orienté pages et réécrit périodiquement ses SSTables, donc il gaspille moins, surtout en compaction *leveled*.

Sur beaucoup de SSD, le micrologiciel utilise lui-même un algorithme log-structuré qui transforme les écritures aléatoires en séquentielles, donc l'impact du schéma d'écriture est moins marqué. Mais moins d'amplification et moins de fragmentation restent avantageux : des données plus compactes permettent plus de lectures et d'écritures dans la bande passante.

## Inconvénients des LSM-trees

1. **La compaction perturbe les requêtes en cours.** Les moteurs essaient de compacter de façon incrémentale, mais les disques ont des ressources limitées : une requête peut devoir attendre qu'une compaction coûteuse se termine. L'effet sur le débit et le temps de réponse moyen est généralement faible, mais **aux percentiles élevés** (voir la leçon sur les percentiles), le temps de réponse d'un moteur log-structuré peut devenir assez élevé, et les B-trees sont plus prévisibles.
2. **La compaction peut ne pas suivre.** La bande passante d'écriture du disque se partage entre l'écriture initiale (WAL, flush de la memtable) et les compactions en arrière-plan. Plus la base grandit, plus la compaction consomme. Si le débit d'écriture est élevé et la compaction mal réglée, elle ne suit plus : les segments non fusionnés s'accumulent jusqu'à **saturer le disque**, et les lectures ralentissent car il faut consulter plus de fichiers. Souvent, les moteurs à SSTable **ne freinent pas** les écritures entrantes dans ce cas : il faut une **surveillance explicite**.
3. **Plusieurs copies d'une clé.** Un B-tree garde chaque clé à un **seul endroit** de l'index, alors qu'un moteur log-structuré peut en avoir plusieurs copies dans des segments différents. Cela rend les B-trees attractifs pour les bases qui veulent de fortes garanties transactionnelles : dans beaucoup de bases relationnelles, l'isolation repose sur des verrous sur des **intervalles de clés**, qu'on peut attacher directement à l'arbre (module 8).

## Aucune règle simple

Les B-trees sont ancrés dans l'architecture des bases et offrent de bonnes performances sur beaucoup de charges : ils ne disparaîtront pas. Dans les nouveaux systèmes, les index log-structurés sont de plus en plus populaires. Il n'existe **aucune règle simple et rapide**: teste empiriquement.

> **Au-delà du livre.** Pour raisonner sur l'amplification, pose un modèle chiffré : avec un compactage *size-tiered* où chaque fusion regroupe `f` segments de même taille, une donnée est réécrite environ une fois par niveau, donc ≈ `log_f(N / taille_flush)` fois. Pour un B-tree : une écriture de 100 octets déclenche un enregistrement WAL de 100 octets et l'écriture d'une page de 4 096 octets, soit ≈ 42×. Tu feras ces calculs dans le TP.

## Pièges fréquents

- **Retenir « LSM = écriture, B-tree = lecture » comme une loi** : les charges, les réglages et le matériel inversent parfois le résultat.
- **Mesurer le débit moyen et pas les percentiles** : c'est exactement là que la compaction fait mal.
- **Ne pas surveiller le retard de compaction** : le disque se remplit sans que les écritures ralentissent.
- **Comparer deux moteurs avec des charges ou des tailles de page différentes.**

## À retenir

- L'amplification en écriture existe des deux côtés : WAL + page pour un B-tree, compactions répétées pour un LSM.
- Les LSM-trees : meilleur débit d'écriture, meilleure compression, moins de fragmentation.
- Mais la compaction perturbe les percentiles élevés et peut ne pas suivre le débit d'écriture.
- Les B-trees : latence plus prévisible, chaque clé à un seul endroit (verrous d'intervalle).
- Teste avec ta charge ; aucune règle universelle.
