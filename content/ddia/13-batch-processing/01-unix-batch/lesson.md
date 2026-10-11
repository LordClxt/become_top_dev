---
id: ddia-ch13-l01
title: "Services, lots, flux et la leçon des outils Unix"
source: { chapter: 10, pages: "389-397" }
duration_min: 35
concepts:
  - id: ddia-batch-three-system-kinds
    label: "Trois familles de systèmes : services en ligne (temps de réponse), lots (débit), flux (quasi temps réel)"
  - id: ddia-batch-unix-log-analysis
    label: "Une chaîne de commandes Unix (awk, sort, uniq, head) analyse des gigaoctets de logs en quelques secondes"
  - id: ddia-batch-sort-vs-hashmap
    label: "Compter en mémoire avec une table de hachage ou trier sur disque : tout dépend de la taille de l'ensemble de travail"
  - id: ddia-batch-unix-uniform-interface
    label: "Interface uniforme : un fichier est une suite d'octets, souvent des lignes, que tout programme sait lire"
  - id: ddia-batch-logic-wiring
    label: "Séparer la logique du câblage : un programme lit stdin et écrit stdout sans savoir d'où vient ni où va la donnée"
  - id: ddia-batch-unix-transparency
    label: "Entrées immuables, étapes inspectables, sorties rejouables : expérimenter sans risque"
glossary:
  - term: "traitement par lots (batch)"
    definition: "Job qui lit un gros volume d'entrées bornées, calcule, et écrit une sortie ; on le juge à son débit, pas à sa latence."
  - term: "traitement de flux (stream)"
    definition: "Entre le service et le lot : il consomme des événements peu après leur arrivée, sur une entrée non bornée."
  - term: "ensemble de travail (working set)"
    definition: "Quantité de données qu'un calcul doit garder accessibles en même temps ; ici, le nombre de clés distinctes à compter."
  - term: "pipe (|)"
    definition: "Relie la sortie standard d'un processus à l'entrée standard du suivant, sans fichier intermédiaire."
  - term: "philosophie Unix"
    definition: "Un programme fait une seule chose bien, sa sortie peut devenir l'entrée d'un autre programme encore inconnu."
visuals: []
labs: [ddia-ch13-l01-lab-log-pipeline]
xp: 40
---

## Pourquoi c'est important

Les chapitres précédents ne parlaient que de requêtes : un client demande, la base répond, vite. Mais une grande partie des données d'une entreprise est **dérivée** : index de recherche, statistiques, recommandations, caches. On les **recalcule** à partir de données brutes. Ce module commence la troisième partie du livre : comment produire des données dérivées de façon fiable. Et le meilleur point de départ n'est pas Hadoop, c'est un terminal Unix.

## Trois familles de systèmes

- **Services (systèmes en ligne)** : une requête arrive, on répond le plus vite possible. On les juge au **temps de réponse** et à la **disponibilité** (les percentiles du module 0).
- **Traitement par lots (systèmes hors ligne)** : un job prend un gros volume d'entrées **bornées**, tourne quelques minutes ou quelques jours, et écrit une sortie. Personne n'attend devant l'écran. On le juge au **débit** : combien de temps pour traiter un téraoctet ?
- **Traitement de flux (quasi temps réel)** : comme un lot, il consomme des entrées et produit des sorties sans répondre à une requête ; mais il traite les événements **peu après leur arrivée**, sur une entrée qui ne finit jamais. C'est le sujet des modules suivants.

Exemple concret : la page produit d'une boutique est un service (200 ms max). Le calcul nocturne des « clients qui ont acheté ceci ont aussi acheté » est un lot. L'alerte « ce produit se vend 10 fois plus que d'habitude depuis 5 minutes » est un flux.

## Analyser des logs avec Unix

Ton serveur web écrit une ligne par requête : adresse IP, date, méthode, URL, code, taille, user-agent. Question : quelles sont les 5 pages les plus vues ?

```bash
cat /var/log/nginx/access.log |
  awk '{print $7}' |   # 7e champ : l'URL demandée
  sort             |   # regroupe les URL identiques
  uniq -c          |   # compte chaque groupe
  sort -r -n       |   # trie par nombre décroissant
  head -n 5            # garde les 5 premières
```

Cette chaîne traite des gigaoctets en quelques secondes, et tu la modifies en une minute (ignorer les fichiers CSS ? un `grep -v` de plus ; compter par IP ? `$1` au lieu de `$7`). Beaucoup de gens sont surpris de tout ce qu'on fait avec `awk`, `sed`, `grep`, `sort`, `uniq` et `xargs`.

### Trier ou compter en mémoire ?

Le même calcul s'écrit en quelques lignes de Go avec une `map[string]int` : on lit les lignes, on incrémente le compteur de l'URL, on trie les compteurs à la fin. Les deux approches diffèrent par leur **ensemble de travail** :

- la table de hachage garde en mémoire **une entrée par URL distincte**. Un site de 50 000 pages, à environ 100 octets par entrée, tient dans 5 Mo, même si le log fait 200 Go : la table gagne ;
- si les clés distinctes ne tiennent pas en mémoire (des milliards d'identifiants de sessions), la table explose. `sort` n'a pas ce problème : il trie des morceaux en mémoire, les écrit sur disque, puis **fusionne** les fichiers triés (la même idée que les SSTables du module 2). Des accès séquentiels, que le disque adore. GNU `sort` parallélise même sur plusieurs cœurs.

Le goulot d'étranglement est alors souvent la **vitesse de lecture du fichier** : la chaîne Unix va aussi vite que le disque.

## La philosophie Unix

Doug McIlroy, l'inventeur des pipes, résumait l'idée en 1978 : chaque programme fait **une seule chose, bien** ; on s'attend à ce que sa sortie devienne l'entrée d'un **autre programme encore inconnu** ; on conçoit pour essayer tôt et jeter sans regret ce qui est raté ; on préfère écrire un outil plutôt que faire une tâche à la main. Automatisation, prototypage rapide, itérations courtes : ce qu'on appelle aujourd'hui l'agilité et le DevOps.

### Une interface uniforme

Pour brancher n'importe quel programme sur n'importe quel autre, il faut que tous parlent la même langue. Sous Unix, c'est le **fichier** (au sens d'un descripteur) : une simple **suite d'octets**. Un fichier sur disque, un pipe, un socket, un périphérique : même interface. Par convention, beaucoup de programmes découpent ces octets en **lignes** (séparées par `\n`, l'octet 0x0A), et une ligne en champs (espaces, tabulations, virgules).

Cette interface n'est pas parfaite (`$7` est bien moins lisible que `$url`), mais elle est **la même partout**, et c'est ce qui fait sa force. Bien peu de logiciels d'aujourd'hui s'assemblent aussi facilement : tu ne peux pas « piper » tes mails dans ton outil de tickets.

### Séparer la logique du câblage

Un outil Unix lit l'**entrée standard** et écrit la **sortie standard**. Il ne sait pas d'où viennent les données ni où elles vont : c'est le shell (ou toi) qui fait le câblage. Le programme ne s'occupe que de sa **logique**. C'est du couplage faible, de la liaison tardive, de l'inversion de contrôle, en avance sur leur temps.

Limites : un programme qui a besoin de **plusieurs entrées ou sorties** se câble mal avec des pipes, on ne peut pas brancher la sortie sur une connexion réseau, et le programme qui ouvre lui-même ses fichiers perd cette souplesse.

### Transparence et expérimentation

- Les **entrées sont immuables** : tu peux relancer la commande autant de fois que tu veux sans rien abîmer.
- Tu peux **couper la chaîne** à n'importe quelle étape et regarder (`| less`) ce qui passe : le débogage est trivial.
- Tu peux **écrire une étape dans un fichier** et relancer seulement la suite plus tard.

La grande limite : tout cela tourne **sur une seule machine**. Les leçons suivantes montrent comment MapReduce garde ces idées en les répartissant sur des milliers de machines.

## Pièges fréquents

- **Écrire un job distribué pour 20 Go de logs** : une chaîne Unix ou un petit programme sur une machine suffit souvent, et va plus vite.
- **Croire que la table de hachage est toujours plus rapide** : elle l'est tant que les clés distinctes tiennent en mémoire ; au-delà, le tri externe gagne.
- **Modifier les fichiers d'entrée en place** : tu perds la possibilité de rejouer le calcul, c'est-à-dire le filet de sécurité principal du traitement par lots.
- **Confondre lot et flux** : la différence n'est pas la vitesse mais la nature de l'entrée (bornée ou non).

## À retenir

- Services : temps de réponse. Lots : débit sur une entrée bornée. Flux : entrée non bornée, traitée peu après l'arrivée.
- Une chaîne `awk | sort | uniq -c | sort -rn | head` est un vrai job de traitement par lots.
- Table de hachage si les clés distinctes tiennent en mémoire ; tri externe (fusion de fichiers triés) sinon.
- Interface uniforme + séparation de la logique et du câblage + entrées immuables : ces trois idées Unix se retrouvent dans MapReduce.
