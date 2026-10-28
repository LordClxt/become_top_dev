---
id: arch-ch07-l03
title: "L'architecture pipeline"
source: { chapter: 11, pages: "163-168" }
duration_min: 40
concepts:
  - id: arch-pipes
    label: "Pipes : canaux unidirectionnels, point à point, petits messages"
  - id: arch-filter-types
    label: "Filtres autonomes et sans état, une seule tâche : producteur, transformateur, testeur, consommateur"
  - id: arch-compositional-reuse
    label: "La réutilisation par composition : Knuth contre McIlroy"
  - id: arch-pipeline-extensibility
    label: "Étendre un pipeline en ajoutant un filtre sans modifier les autres (exemple de télémétrie)"
  - id: arch-pipeline-ratings
    label: "Notes : partitionné techniquement, un quantum ; coût, simplicité, modularité forts ; scalabilité et tolérance aux pannes faibles"
glossary:
  - term: "pipeline (pipes and filters)"
    definition: "Style où des filtres indépendants sont reliés par des tuyaux à sens unique."
  - term: "producteur (source)"
    definition: "Point de départ : il émet, il ne reçoit rien."
  - term: "transformateur"
    definition: "Reçoit, transforme tout ou partie des données, transmet (le map des langages fonctionnels)."
  - term: "testeur"
    definition: "Reçoit, teste un ou plusieurs critères, et transmet ou non selon le résultat."
  - term: "consommateur (sink)"
    definition: "Point d'arrivée : il persiste ou affiche le résultat."
  - term: "ETL"
    definition: "Extract, Transform, Load : déplacer et transformer des données d'une source vers une autre."
visuals: [arch-ch07-pipeline-builder]
labs: [arch-ch07-l03-lab-telemetry-pipeline]
xp: 40
---

## Pourquoi c'est important

Donald Knuth, l'un des plus grands informaticiens, reçoit un exercice : lire un texte, trouver les *n* mots les plus fréquents, les afficher triés avec leur fréquence. Il écrit **plus de dix pages de Pascal**, et invente au passage un nouvel algorithme, soigneusement documenté. Doug McIlroy répond avec **six commandes shell** reliées par des `|`. Plus simple, plus élégant, plus lisible (pour qui connaît le shell).

Ce n'était pas une question de talent : c'était une question de **style**. McIlroy a composé des filtres existants. C'est l'architecture **pipeline**, l'un des styles fondamentaux qui reviennent sans cesse.

```bash
tr -cs A-Za-z '\n' |   # un mot par ligne
tr A-Z a-z |           # en minuscules
sort |                 # regrouper les mots identiques
uniq -c |              # compter chaque groupe
sort -rn |             # du plus fréquent au moins fréquent
sed ${1}q              # garder les n premiers
```

## Pipes et filtres

Dès que l'on découpe une fonctionnalité en morceaux distincts, ce style apparaît. On le connaît par les shells Unix (Bash, Zsh) ; les langages fonctionnels en ont les équivalents ; les outils **MapReduce** en suivent la topologie. Mais il sert aussi pour des applications métier de plus haut niveau.

### Les pipes

Les **tuyaux** sont les canaux de communication entre filtres. Ils sont en général **unidirectionnels** et **point à point** (pas de diffusion), pour la performance : une entrée d'une source, une sortie vers une destination. Le contenu peut être de n'importe quel format, mais on préfère de **petits** messages, pour la performance.

### Les filtres

Les filtres sont **autonomes**, **indépendants** les uns des autres et en général **sans état**. Chacun ne fait **qu'une seule tâche** ; une tâche composite se fait par une **suite** de filtres. Quatre types :

- **Producteur** (*source*) : le point de départ, uniquement sortant.
- **Transformateur** : reçoit, transforme tout ou partie des données, transmet. C'est le **map** des langages fonctionnels.
- **Testeur** : reçoit, teste un ou plusieurs critères, et transmet **ou non** selon le résultat. Le livre le rapproche du **reduce** ; en pratique, il se comporte surtout comme un **filter** fonctionnel ou un aiguillage.
- **Consommateur** : le point d'arrivée. Il persiste le résultat en base, ou l'affiche.

Le caractère unidirectionnel et la simplicité de chaque élément favorisent la **réutilisation par composition** : on construit de nouveaux traitements en assemblant des filtres existants, exactement comme McIlroy.

## Des exemples

On retrouve ce style dans les outils d'**EDI** (échange de données informatisé : transformer un type de document en un autre), les outils **ETL** (extraire, transformer, charger des données d'une source vers une autre), et les orchestrateurs comme **Apache Camel**, qui font passer l'information d'une étape d'un processus à la suivante.

### La télémétrie des services

L'exemple du livre : des services envoient leur télémétrie en flux dans **Kafka**.

1. **Service Info Capture** (producteur) s'abonne au topic Kafka et reçoit les informations.
2. **Duration Filter** (testeur) vérifie si la donnée concerne la **durée** des requêtes (en ms). Si oui, elle va vers **Duration Calculator** (transformateur). Sinon, vers **Uptime Filter**.
3. **Uptime Filter** (testeur) vérifie s'il s'agit de **disponibilité**. Si oui, vers **Uptime Calculator** (transformateur) ; sinon, le flux s'arrête : la donnée n'intéresse pas ce traitement.
4. Les deux calculateurs envoient leur résultat à **Database Output** (consommateur), qui l'écrit dans MongoDB.

Remarque la séparation des préoccupations : le producteur ne sait que se connecter à Kafka et recevoir ; le testeur ne sait que qualifier et aiguiller. Et l'**extensibilité** : pour une nouvelle métrique (le temps d'attente d'une connexion à la base, par exemple), on ajoute un testeur **après** Uptime Filter, et un calculateur : **aucun filtre existant ne change**.

### Sous le capot : des filtres comme générateurs

```typescript
type Filter<I, O> = (input: Iterable<I>) => Iterable<O>;
const words: Filter<string, string> = function* (lines) { for (const l of lines) yield* l.split(/[^A-Za-z]+/).filter(Boolean); };
const lower: Filter<string, string> = function* (ws) { for (const w of ws) yield w.toLowerCase(); };
const longOnly: Filter<string, string> = function* (ws) { for (const w of ws) if (w.length > 3) yield w; };
const text = ['Pipes and filters', 'FILTERS and pipes compose'];
console.log([...longOnly(lower(words(text)))].join(' '));
// pipes filters filters pipes compose
```

Chaque filtre ne connaît que son entrée et sa sortie ; on les recompose à volonté. Et parce que ce sont des générateurs, le flux est **paresseux** : rien n'est calculé tant que le consommateur ne le demande pas, ce qui permet de s'arrêter tôt (le `sed ${1}q` de McIlroy). Le projet archkit de ce module en fait une vraie bibliothèque, asynchrone.

## Le bulletin de notes

- **Partitionné techniquement** (la logique est découpée par types de filtres), en général déployé comme un **monolithe** : **un seul quantum**.
- **Forts** : **coût**, **simplicité** et **modularité**. La modularité vient de la séparation des préoccupations entre filtres : chacun peut être modifié ou remplacé sans toucher les autres.
- **Déployabilité et testabilité** : **moyennes**, un peu au-dessus des couches grâce à cette modularité, mais c'est toujours un monolithe (cérémonie, risque, fréquence, tests complets).
- **Fiabilité** : **moyenne** (trois étoiles), comme les couches.
- **Élasticité et scalabilité** : **très faibles** (une étoile), un seul quantum.
- **Tolérance aux pannes** : **aucune** ; un filtre qui provoque un dépassement de mémoire fait tomber toute l'application, et le MTTR d'un monolithe est élevé.

::visual{id="arch-ch07-pipeline-builder"}

## Pièges fréquents

- **Un filtre qui fait tout** : il faut une tâche par filtre, une suite de filtres pour une tâche composite.
- **Des filtres avec état partagé** : on perd l'indépendance qui permet de les recomposer.
- **De gros messages dans les tuyaux** : ils pèsent sur la performance.
- **Modifier un filtre existant** pour ajouter une métrique, au lieu d'insérer un nouveau testeur.
- **Attendre de la scalabilité** d'un pipeline monolithique.

## À retenir

- **Pipes** : unidirectionnels, point à point, petits messages. **Filtres** : autonomes, sans état, une tâche.
- Quatre types : **producteur**, **transformateur** (map), **testeur** (aiguillage), **consommateur**.
- **Réutilisation par composition** : six commandes de McIlroy contre dix pages de Knuth.
- **Extensible** : un nouveau testeur s'insère sans toucher l'existant (télémétrie, EDI, ETL, Camel).
- Notes : **un quantum**, coût, simplicité et **modularité** forts ; déployabilité et testabilité moyennes ; scalabilité et élasticité très faibles ; pas de tolérance aux pannes.
