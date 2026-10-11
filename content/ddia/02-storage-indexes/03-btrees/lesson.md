---
id: ddia-ch02-l03
title: "Les B-trees"
source: { chapter: 3, pages: "79-83" }
duration_min: 35
concepts:
  - id: ddia-btree-pages
    label: "B-tree : arbre de pages de taille fixe qui se référencent entre elles"
  - id: ddia-branching-factor
    label: "Facteur de branchement et profondeur O(log n)"
  - id: ddia-btree-split
    label: "Éclatement (split) d'une page pleine"
  - id: ddia-btree-wal
    label: "Écrasement en place : journal WAL et verrous légers (latches)"
  - id: ddia-btree-optimizations
    label: "Optimisations : copy-on-write, clés abrégées, feuilles séquentielles, pointeurs frères"
glossary:
  - term: "B-tree"
    definition: "Structure d'index standard des bases relationnelles : arbre de pages de taille fixe (4 Ko), triées par clé, lues et écrites une page à la fois."
  - term: "page"
    definition: "Bloc de taille fixe, identifié par une adresse, qui peut référencer d'autres pages comme un pointeur sur disque."
  - term: "facteur de branchement"
    definition: "Nombre de références vers des pages enfants dans une page ; typiquement plusieurs centaines."
  - term: "page feuille (leaf)"
    definition: "Page du bas de l'arbre qui contient les clés une à une avec leur valeur, ou une référence vers l'endroit où elle se trouve."
  - term: "split"
    definition: "Découpage d'une page pleine en deux pages à moitié remplies, avec mise à jour de la page parent."
  - term: "WAL / redo log"
    definition: "Fichier en ajout seul où toute modification du B-tree est écrite avant d'être appliquée aux pages ; il sert à restaurer un arbre cohérent après un crash."
  - term: "latch"
    definition: "Verrou léger qui protège les structures du B-tree contre des accès concurrents incohérents."
  - term: "copy-on-write"
    definition: "Au lieu d'écraser une page, on écrit la version modifiée ailleurs et on crée une nouvelle version des pages parentes qui pointe vers elle (LMDB)."
visuals: [ddia-ch02-btree-split]
labs: [ddia-ch02-l03-lab-btree-design]
xp: 35
---

## Pourquoi c'est important

Le B-tree est la structure d'index la plus utilisée du monde. Introduit en 1970, il est resté le standard dans presque toutes les bases relationnelles et dans beaucoup de bases non relationnelles. Si tu as déjà écrit `CREATE INDEX`, tu as très probablement construit un B-tree.

## Une philosophie différente

Comme les SSTables, un B-tree garde les paires clé-valeur **triées par clé** : recherche par clé et par intervalle efficaces. Mais la ressemblance s'arrête là.

- Les index log-structurés découpent la base en **segments** de taille variable (plusieurs Mo), écrits toujours **séquentiellement**.
- Le B-tree la découpe en **pages** de taille fixe, traditionnellement **4 Ko**, lues et écrites **une page à la fois**. Cela correspond mieux au matériel : les disques aussi sont organisés en blocs de taille fixe.

Chaque page a une adresse, ce qui permet à une page d'en référencer une autre, comme un pointeur, mais sur disque. On construit ainsi un **arbre de pages**.

## Chercher une clé

Une page est la **racine** ; toute recherche commence là. La page contient plusieurs clés et des références vers des pages enfants. Chaque enfant couvre un **intervalle continu** de clés, et les clés entre les références donnent les frontières. Pour chercher `251`, on suit la référence entre les bornes `200` et `300`, on arrive à une page qui subdivise cet intervalle, et ainsi de suite jusqu'à une **page feuille**, qui contient les clés une à une avec leur valeur (ou une référence vers elle).

Le nombre de références vers des enfants dans une page est le **facteur de branchement**. Il dépend de la place prise par références et bornes ; il vaut typiquement **plusieurs centaines**.

## Modifier et éclater

- **Mettre à jour** une clé existante : trouve la feuille, change la valeur, réécris la page (les références vers elle restent valides).
- **Ajouter** une clé : trouve la page dont l'intervalle contient la clé et ajoute-la. S'il n'y a plus de place, la page est **éclatée** (*split*) en **deux pages à moitié pleines**, et la page parente est mise à jour pour refléter la nouvelle subdivision.

Cet algorithme garde l'arbre **équilibré** : un B-tree de *n* clés a toujours une profondeur en **O(log n)**. La plupart des bases tiennent dans un arbre de trois ou quatre niveaux, donc peu de références à suivre. **Un arbre à quatre niveaux de pages de 4 Ko avec un facteur de branchement de 500 peut stocker jusqu'à 256 To.**

```go
// éclatement d'une feuille de maxKeys clés + la nouvelle
mid := len(keys) / 2
left, right := keys[:mid], keys[mid:]
promoted := right[0] // la plus petite clé de la page de droite monte dans le parent
```

::visual{id="ddia-ch02-btree-split"}

## Rendre le B-tree fiable

L'opération d'écriture de base est d'**écraser une page** sur disque avec de nouvelles données, sans changer son emplacement. C'est l'inverse des LSM-trees, qui ne font qu'ajouter (puis supprimer les fichiers obsolètes).

Le danger : certaines opérations modifient **plusieurs pages**. Un éclatement écrit les deux pages issues du split **et** réécrit leur parent. Si la base tombe après quelques-unes seulement de ces écritures, l'index est **corrompu** (par exemple une page orpheline qui n'est l'enfant d'aucun parent).

Pour résister aux crashs, les implémentations ajoutent un **write-ahead log (WAL, ou redo log)** : un fichier en ajout seul où chaque modification doit être écrite **avant** d'être appliquée aux pages. Au redémarrage, on s'en sert pour ramener l'arbre à un état cohérent. Tu l'implémenteras dans le boss de ce module.

Autre complication de la mise à jour sur place : si plusieurs threads accèdent à l'arbre, il faut un contrôle de concurrence soigneux, sinon un thread verrait un arbre incohérent. On protège les structures par des **latches**. Les approches log-structurées sont plus simples sur ce point : elles fusionnent en arrière-plan et **échangent atomiquement** anciens et nouveaux segments.

## Optimisations

- **Copy-on-write** (LMDB) : au lieu d'écraser une page et de tenir un WAL, on écrit la page modifiée ailleurs et on crée une nouvelle version des parents qui y pointe. Utile aussi pour la concurrence (isolation par snapshot, module 8).
- **Clés abrégées** : dans les pages internes, les clés n'ont besoin que de servir de frontière. En les abrégeant, on tasse plus de clés par page : facteur de branchement plus grand, moins de niveaux (variante dite B+ tree).
- **Feuilles séquentielles** : les pages peuvent être n'importe où sur disque. Pour un parcours trié, un seek par page serait coûteux, donc beaucoup d'implémentations essaient de ranger les feuilles dans l'ordre sur disque. C'est difficile à maintenir quand l'arbre grandit ; les LSM-trees, qui réécrivent de gros segments, y arrivent mieux.
- **Pointeurs frères** : chaque feuille référence ses voisines de gauche et de droite pour parcourir les clés en ordre sans remonter au parent.
- **Variantes** comme les *fractal trees*, qui empruntent des idées log-structurées pour réduire les seeks (rien à voir avec les fractales).

## Pièges fréquents

- **Éclater sans mettre à jour le parent** : la nouvelle page est orpheline, ses clés deviennent introuvables.
- **Écrire les pages sans WAL** : un crash au milieu d'un split corrompt l'arbre.
- **Choisir le milieu au hasard** : l'éclatement doit produire deux moitiés ; sinon l'arbre se déséquilibre.
- **Oublier le cas de la racine** : quand la racine éclate, il faut créer une **nouvelle racine** (l'arbre gagne un niveau).

## À retenir

- Le B-tree range des pages de taille fixe triées par clé, avec un grand facteur de branchement : 3 à 4 niveaux suffisent.
- Insertion : écrire dans la feuille, éclater si pleine, propager vers le haut ; l'arbre reste équilibré, profondeur O(log n).
- L'écrasement en place demande un WAL pour survivre à un crash en plein split, et des latches pour la concurrence.
- Optimisations courantes : copy-on-write, clés abrégées, feuilles séquentielles, pointeurs frères.
