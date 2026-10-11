---
id: ddia-ch05-l03
title: "Que contient le log de réplication ?"
source: { chapter: 5, pages: "158-161" }
duration_min: 35
concepts:
  - id: ddia-repl-log-statement
    label: "Réplication par instructions : rejouer chaque INSERT/UPDATE/DELETE, piégée par le non-déterminisme"
  - id: ddia-repl-log-wal-shipping
    label: "Expédition du WAL : envoyer aux followers le journal d'écriture anticipée, octet par octet"
  - id: ddia-repl-log-logical
    label: "Log logique (par ligne) : décrire chaque ligne insérée, supprimée ou modifiée, indépendamment du moteur"
  - id: ddia-repl-log-trigger
    label: "Réplication par triggers : sortir le changement dans le code applicatif pour plus de souplesse, au prix de la robustesse"
  - id: ddia-repl-log-engine-coupling
    label: "Un log couplé au format de stockage interdit des versions différentes entre leader et followers"
glossary:
  - term: "réplication par instructions (statement-based)"
    definition: "Le leader journalise chaque requête d'écriture SQL et chaque follower la réexécute."
  - term: "expédition du WAL (WAL shipping)"
    definition: "Le leader envoie aux followers son journal d'écriture anticipée, qui décrit quels octets ont changé dans quels blocs du disque."
  - term: "log logique (row-based)"
    definition: "Un log propre à la réplication qui décrit les écritures ligne par ligne, séparé de la représentation interne du moteur."
  - term: "capture des changements (change data capture, CDC)"
    definition: "Lire le log logique d'une base pour transmettre ses changements à d'autres systèmes : entrepôt, index, caches."
  - term: "trigger"
    definition: "Code applicatif enregistré dans la base et exécuté automatiquement à chaque écriture sur une table."
  - term: "fonction non déterministe"
    definition: "Fonction dont le résultat dépend du moment ou du hasard, comme NOW() ou RAND()."
visuals: []
labs: [ddia-ch05-l03-lab-log-formats]
xp: 40
---

## Pourquoi c'est important

« Le leader envoie ses changements aux followers » : mais **sous quelle forme** ? Une requête SQL, des octets de pages disque, une liste de lignes ? Ce choix a l'air d'un détail d'implémentation. Il décide pourtant si tes réplicas peuvent diverger, si tu peux mettre à jour la base sans interruption, et si d'autres systèmes peuvent lire le flux. Il prolonge directement le module 04 : un log de réplication est un **format d'encodage** entre deux versions de code, avec les mêmes questions de compatibilité.

## 1. La réplication par instructions

Le plus simple : le leader journalise **chaque requête d'écriture** (`INSERT`, `UPDATE`, `DELETE`) et envoie son texte aux followers, qui la réexécutent comme si un client la leur avait envoyée.

C'est compact : un `UPDATE` qui touche 40 000 lignes tient en une ligne de log. Mais plusieurs choses cassent :

- **Les fonctions non déterministes.** `INSERT INTO events (at) VALUES (NOW())` donne une heure différente sur chaque réplica ; `RAND()` aussi.
- **Les instructions qui dépendent des données existantes** doivent s'exécuter dans **exactement** le même ordre sur chaque réplica. Exemples : une colonne auto-incrémentée, ou `UPDATE … WHERE <condition>`. Avec plusieurs transactions concurrentes, cela devient très contraignant.
- **Les effets de bord** (triggers, procédures stockées, fonctions définies par l'utilisateur) peuvent produire des résultats différents d'un réplica à l'autre, sauf s'ils sont parfaitement déterministes.

On peut contourner : le leader remplace chaque appel non déterministe par sa **valeur figée** au moment de l'exécution (`NOW()` devient `'2026-10-11 14:03:07'`). Mais les cas limites sont si nombreux que d'autres méthodes sont généralement préférées. MySQL utilisait ce mode avant la version 5.1 ; aujourd'hui, il bascule par défaut vers la réplication par ligne dès qu'une instruction est non déterministe. VoltDB l'utilise encore, en **exigeant** des transactions déterministes.

## 2. L'expédition du WAL

Au module 02, tu as vu que chaque moteur écrit déjà un journal :

- un moteur **à log** (SSTables, LSM-tree) : le log **est** le stockage principal ; on compacte des segments en arrière-plan ;
- un **B-tree** : chaque modification est d'abord écrite dans le **WAL** (journal d'écriture anticipée), pour pouvoir restaurer un état cohérent après un crash.

Dans les deux cas, c'est un journal en **ajout seul** de toutes les écritures. Le même journal peut construire un réplica : le leader l'écrit sur disque **et** l'envoie aux followers, qui reconstruisent exactement les mêmes structures. PostgreSQL et Oracle, entre autres, fonctionnent ainsi.

L'inconvénient : ce journal est de **très bas niveau**. Il dit quels octets ont changé dans quels blocs disque. La réplication est donc **couplée au moteur de stockage**. Si la nouvelle version de la base change son format de stockage, le leader et les followers ne peuvent généralement pas tourner avec des versions différentes.

Conséquence opérationnelle : idéalement, on met à jour sans interruption en passant d'abord les followers à la nouvelle version, puis on fait un failover pour qu'un follower à jour devienne leader. C'est la mise à jour progressive du module 04. Si le protocole de réplication interdit les versions mixtes (cas typique de l'expédition du WAL), ces mises à jour **exigent un arrêt**.

## 3. Le log logique, ligne par ligne

Solution : utiliser **deux formats différents**, l'un pour le stockage, l'autre pour la réplication. Ce log de réplication est dit **logique**, par opposition à la représentation physique du moteur. Pour une base relationnelle, c'est une suite d'enregistrements qui décrivent les écritures **ligne par ligne** :

- **insertion** : les nouvelles valeurs de toutes les colonnes ;
- **suppression** : de quoi identifier la ligne de façon unique, en général la clé primaire ; sans clé primaire, les anciennes valeurs de toutes les colonnes ;
- **mise à jour** : de quoi identifier la ligne, plus les nouvelles valeurs des colonnes (au moins celles qui ont changé).

Une transaction qui modifie plusieurs lignes produit plusieurs enregistrements, puis un enregistrement qui indique le **commit**. Le binlog de MySQL, configuré en réplication par ligne, suit ce modèle.

Exemple : `UPDATE products SET price = price * 1.1 WHERE category = 'books'` touche 40 000 lignes. En log logique, c'est **40 000 enregistrements de ligne + 1 commit**, et non une seule instruction. Plus volumineux, mais chaque enregistrement contient la **valeur finale** : plus de `NOW()` ou de `RAND()` à recalculer, plus de dépendance à l'ordre d'exécution concurrente.

Deux grands avantages :

- **Découplage du moteur** : le format reste rétrocompatible, donc leader et followers peuvent tourner avec des versions différentes, voire des moteurs de stockage différents.
- **Lisible par d'autres systèmes** : on peut envoyer le flux vers un entrepôt de données (module 03), construire des index ou des caches sur mesure. C'est la **capture des changements** (*change data capture*), que le livre approfondit au chapitre 11 (module 14).

## 4. La réplication par triggers

Les trois méthodes précédentes sont faites par la base, sans code applicatif. Parfois, il faut plus de souplesse :

- ne répliquer qu'**une partie** des données ;
- répliquer d'**un type de base vers un autre** ;
- appliquer une **logique de résolution de conflits** maison (utile en multi-leader, module 06).

On remonte alors la réplication dans la couche applicative. Certains outils, comme Oracle GoldenGate, rendent les changements accessibles à une application en lisant le log de la base. L'autre voie passe par les **triggers** et les procédures stockées : un trigger, exécuté à chaque écriture, recopie le changement dans une table séparée, qu'un processus externe lit pour l'appliquer ailleurs. Databus (pour Oracle) et Bucardo (pour PostgreSQL) fonctionnent ainsi.

Le prix : **plus de surcoût** que la réplication intégrée, et **plus de risques** de bogues et de limitations. Mais la souplesse peut le justifier.

## Comparer d'un coup d'œil

| Méthode | Ce qui circule | Point fort | Point faible |
|---|---|---|---|
| Instructions | Le texte SQL | Compact | Non-déterminisme, ordre strict |
| WAL | Octets modifiés par bloc | Gratuit : le journal existe déjà | Couplé au moteur, versions mixtes impossibles |
| Logique (ligne) | Valeurs des lignes + commit | Découplé, lisible (CDC) | Plus volumineux pour les écritures massives |
| Triggers | Ce que ton code décide | Souplesse totale | Surcoût, bogues |

## Pièges fréquents

- **Croire qu'une instruction rejouée donne le même résultat** : `NOW()`, `RAND()`, un auto-incrément ou un `UPDATE … LIMIT` sans ordre suffisent à faire diverger les réplicas.
- **Prévoir une mise à jour sans arrêt avec l'expédition du WAL** : vérifie d'abord que la nouvelle version peut suivre l'ancienne.
- **Supprimer une ligne sans clé primaire** en log logique : le log doit contenir toutes les colonnes pour l'identifier.
- **Ajouter des triggers de réplication sur des tables très sollicitées** sans mesurer leur coût : chaque écriture en déclenche une autre.

## À retenir

- Instructions : compact, mais piégé par le non-déterminisme et l'ordre ; MySQL a basculé vers la réplication par ligne.
- WAL : réutilise le journal du moteur, mais le couple à la version, ce qui bloque les mises à jour sans arrêt.
- Log logique : une ligne par changement plus le commit ; découplé du moteur et lisible par d'autres systèmes (capture des changements).
- Triggers : souplesse applicative, au prix du surcoût et de la fragilité.
