---
id: ddia-ch15-l04
title: "Jointures de flux"
source: { chapter: 11, pages: "473-476" }
duration_min: 40
concepts:
  - id: ddia-sp-stream-stream-join
    label: "Jointure flux-flux (fenêtrée) : apparier deux flux d'événements dans une fenêtre de temps, avec un état indexé par clé de jointure"
  - id: ddia-sp-stream-table-join
    label: "Jointure flux-table (enrichissement) : copie locale de la table, tenue à jour par CDC, au lieu d'une requête distante par événement"
  - id: ddia-sp-table-table-join
    label: "Jointure table-table : deux changelogs joints pour maintenir une vue matérialisée (fil d'actualité)"
  - id: ddia-sp-join-time-dependence
    label: "Dépendance temporelle : sans ordre garanti entre flux, la jointure est non déterministe"
  - id: ddia-sp-versioned-join
    label: "Slowly changing dimension : joindre sur l'identifiant d'une version précise rend la jointure déterministe, au prix de la compaction"
glossary:
  - term: "jointure fenêtrée (window join)"
    definition: "Jointure de deux flux d'événements qui n'apparie que des événements séparés de moins d'une certaine durée."
  - term: "enrichissement"
    definition: "Ajouter à chaque événement des informations tirées d'une table (profil de l'utilisateur, prix du produit…)."
  - term: "changelog"
    definition: "Flux de changements d'une table, typiquement produit par capture des changements (CDC)."
  - term: "slowly changing dimension (SCD)"
    definition: "Terme d'entrepôt de données pour une table de référence qui change lentement (taux de TVA, adresse) et dont il faut garder les versions."
visuals: []
labs: [ddia-ch15-l04-lab-enrichment-design]
xp: 40
---

## Pourquoi c'est important

Au ch. 13, on a vu les jointures en batch : par tri-fusion, par diffusion, partitionnées. Elles supposent une entrée **finie** qu'on peut trier ou charger. Un flux, lui, n'a pas de fin, et de nouveaux événements peuvent arriver à tout moment, de chaque côté de la jointure. Pourtant, presque tout traitement de flux sérieux joint quelque chose : un clic avec sa recherche, un achat avec le profil du client, un tweet avec la liste des abonnés. Il existe **trois** sortes de jointures en flux, et un piège commun : le **temps**.

## Flux-flux : la jointure fenêtrée

Ton moteur de recherche veut mesurer le **taux de clic** de chaque résultat. Deux flux arrivent :

- un événement **recherche** à chaque requête (identifiant de session, requête, résultats affichés) ;
- un événement **clic** quand l'utilisateur clique un résultat (identifiant de session, URL).

Pour savoir quelles recherches ont mené à un clic, on joint par **identifiant de session**. Mais le clic peut arriver une seconde, une heure ou un jour après la recherche, ou **jamais** (l'utilisateur abandonne). On choisit donc une **fenêtre** : par exemple, n'apparier que les clics survenus dans l'**heure** qui suit la recherche.

Pourquoi ne pas simplement copier les détails de la recherche dans l'événement clic ? Parce qu'on ne connaîtrait alors que les recherches **cliquées**. Le taux de clic a besoin des deux : les recherches avec clic **et sans clic**. La jointure seule le permet.

Fonctionnement : l'opérateur garde un **état**, tous les événements de la dernière heure indexés par identifiant de session.

1. Une recherche ou un clic arrive : on l'ajoute à l'index de son côté.
2. On consulte l'index de l'**autre** côté : si un événement de même session s'y trouve, on émet un événement « tel résultat a été cliqué ».
3. Quand une recherche **expire** de la fenêtre sans clic, on émet un événement « ces résultats n'ont pas été cliqués ».

Coût : l'état contient une heure de recherches et de clics. À 20 000 recherches/s et 500 octets par événement, cela fait 20 000 × 3 600 × 500 octets ≈ **36 Go** pour le seul côté recherche : il faut partitionner par identifiant de session (ch. 7) pour que chaque nœud n'en porte qu'une part.

## Flux-table : l'enrichissement

Deuxième cas : un flux d'**activité** (« l'utilisateur 42 a ajouté un article au panier ») qu'on veut **enrichir** avec le profil de l'utilisateur (âge, pays, segment). C'est une jointure entre un **flux** et une **table** : la base des profils.

L'approche naïve : interroger la base distante à chaque événement. Elle est **lente** (un aller-retour réseau par événement) et elle risque de **surcharger** la base : un flux de 50 000 événements/s devient 50 000 lectures/s sur PostgreSQL.

La bonne approche : **charger une copie de la table dans l'opérateur**, en mémoire (table de hachage) ou sur disque local (un index), et la consulter **localement**. C'est l'équivalent en flux de la **jointure côté map par hachage** du ch. 13.

Différence avec le batch : un job batch prend un **instantané** de la table au début. Un opérateur de flux tourne **indéfiniment** ; sa copie doit donc rester **à jour**. La solution vient du chapitre précédent : la **capture des changements** (CDC). L'opérateur s'abonne **à deux flux** : le flux d'activité, et le changelog de la base des profils. Chaque changement de profil met à jour la copie locale ; chaque événement d'activité la lit.

Vu ainsi, la jointure flux-table **est** une jointure flux-flux, dont le côté table a une fenêtre qui remonte **au début des temps** (et où une nouvelle version d'un profil écrase l'ancienne), tandis que le côté activité n'a pas de fenêtre du tout.

## Table-table : maintenir une vue matérialisée

Troisième cas, le fil d'actualité de Twitter (ch. 0). On ne veut pas recalculer le fil à chaque lecture ; on le **maintient** dans un cache, une boîte par utilisateur, mise à jour en écriture :

- un utilisateur **publie** un tweet : on l'ajoute au fil de chacun de ses abonnés ;
- il **supprime** un tweet : on le retire de tous ces fils ;
- un utilisateur A **s'abonne** à B : on ajoute les tweets récents de B au fil de A ;
- A se **désabonne** de B : on retire les tweets de B du fil de A.

L'opérateur a besoin de **deux** flux, les tweets (créations, suppressions) et les abonnements (abonnements, désabonnements), et il maintient **deux** états : l'ensemble des abonnés de chaque utilisateur (pour savoir quels fils toucher quand un tweet arrive) et les tweets récents de chacun.

Autrement dit, il maintient la **vue matérialisée** d'une requête qui joint deux tables :

```sql
SELECT follows.follower_id AS timeline_id,
       array_agg(tweets.* ORDER BY tweets.timestamp DESC)
FROM tweets
JOIN follows ON follows.followee_id = tweets.sender_id
GROUP BY follows.follower_id;
```

Les flux de changements des deux tables sont joints, et les fils sont un cache du résultat, mis à jour à chaque changement de l'une ou l'autre table. Une image du livre : si l'on voit un flux comme la **dérivée** d'une table, cette jointure suit la règle du produit, (u·v)′ = u′v + uv′ : tout changement de tweets est joint à l'état courant des abonnements, et tout changement d'abonnements à l'état courant des tweets.

## Le piège commun : le temps

Les trois jointures ont la même structure : l'opérateur maintient un **état** à partir d'une entrée (recherches, profils, abonnements) et le **consulte** pour chaque message de l'autre entrée. L'**ordre** des événements qui construisent l'état compte donc : s'abonner puis se désabonner n'est pas se désabonner puis s'abonner.

Or l'ordre n'est garanti **qu'à l'intérieur d'une partition** (ch. 14). Entre deux flux, ou entre deux partitions, **aucune garantie**. Question : un profil est modifié et un événement d'activité arrive à peu près au même moment ; lequel l'opérateur voit-il en premier ? Si rien ne le fixe, **le résultat dépend du hasard**, et un retraitement du même flux pourra donner un autre résultat. La jointure est **non déterministe**.

Exemple classique : tu vends des biens et dois appliquer la **TVA**, dont le taux dépend du pays, du type de produit et de la **date** de la vente. Tu joins le flux des ventes à la table des taux. En temps réel, tu prends le taux courant. Mais si tu **retraites** les ventes de l'an dernier après un bogue, il faut le taux **en vigueur à la date de chaque vente**, pas le taux d'aujourd'hui. Si le taux passe de 20 % à 21 % le 1er janvier et qu'une vente du 31 décembre est jointe après le changement, elle est facturée au mauvais taux.

En entrepôt de données, on appelle cela une **slowly changing dimension** (SCD). La solution habituelle : donner un **identifiant unique à chaque version** de l'enregistrement joint. Chaque fois que le taux change, il reçoit un nouvel identifiant (`tva-fr-std-v7`), et la **facture inclut l'identifiant** du taux en vigueur au moment de la vente. La jointure se fait sur cet identifiant : elle devient **déterministe**, quel que soit l'ordre d'arrivée.

Le prix : la **compaction de log** n'est plus possible, puisqu'il faut garder **toutes** les versions de la table, pas seulement la dernière par clé.

## Pièges fréquents

- **Interroger la base distante pour chaque événement** : lent, et cela fait tomber la base aux heures de pointe.
- **Enrichir avec un instantané figé** : un job de flux qui tourne six mois sert des profils de six mois.
- **Oublier les recherches sans clic** : la jointure doit aussi émettre ce qui expire sans correspondance.
- **Supposer un ordre entre deux flux** : seul l'ordre d'une partition est garanti.
- **Retraiter avec la valeur courante d'une dimension** : il faut la version en vigueur à la date de l'événement.

## À retenir

- Flux-flux : jointure fenêtrée, état indexé par clé, émission des appariements et des expirations.
- Flux-table : copie locale de la table, tenue à jour par CDC ; c'est une fenêtre « depuis toujours » côté table.
- Table-table : deux changelogs joints maintiennent une vue matérialisée (le fil d'actualité).
- Sans ordre entre flux, la jointure est non déterministe ; joindre sur un identifiant de version la rend déterministe, mais interdit la compaction.
