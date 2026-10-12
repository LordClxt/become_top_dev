---
id: ddia-ch10-l03
title: Horloges non fiables et ordre des événements
source:
  chapter: 8
  pages: 291-303
duration_min: 50
concepts:
- id: ddia-clock-types
  label: Horloge de l'heure murale (peut reculer, sauter) contre horloge monotone (durées uniquement, valeur absolue sans sens)
- id: ddia-clock-drift
  label: 'Dérive du quartz (~200 ppm), synchronisation NTP imparfaite (≥ 35 ms sur Internet), sauts de secondes intercalaires : les horloges de
    deux machines divergent'
- id: ddia-clock-silent-failure
  label: 'Une horloge fausse ne plante rien : elle corrompt silencieusement ; il faut surveiller les décalages'
- id: ddia-lww-timestamps
  label: 'Dernier écrivain gagnant avec des horodatages réels : écritures perdues, concurrence indiscernable de la séquence'
- id: ddia-logical-clocks
  label: Horloges logiques (Lamport) ordonnent les événements sans mesurer le temps, via des compteurs incrémentés
- id: ddia-clock-confidence-interval
  label: Une lecture d'horloge est un intervalle de confiance ; TrueTime de Spanner donne [earliest, latest]
- id: ddia-commit-wait
  label: 'Commit-wait : attendre la largeur de l''intervalle avant de valider pour que deux intervalles ne se chevauchent jamais'
glossary:
- term: horloge murale (time-of-day)
  definition: Date et heure selon un calendrier ; peut être resynchronisée et revenir en arrière.
- term: horloge monotone
  definition: Compteur qui ne recule jamais ; sert à mesurer des durées sur une même machine.
- term: NTP
  definition: Protocole qui resynchronise l'horloge d'une machine sur des serveurs de temps.
- term: horloge logique
  definition: Compteur qui ordonne les événements sans lien avec l'heure réelle.
- term: TrueTime
  definition: API de Spanner qui renvoie un intervalle [earliest, latest] contenant l'instant réel.
visuals: []
labs:
- ddia-ch10-l03-lab-clocks-design
extra: false
xp: 50
---

## Pourquoi c'est important

On utilise l'heure partout : durée d'un appel, expiration d'un cache, date d'un message, « la plus récente » de deux écritures. Chaque machine a **sa propre horloge**, un peu fausse. Si ton algorithme suppose que deux horloges sont d'accord, il perdra des données et personne ne verra d'erreur.

## Deux sortes d'horloges

- **L'horloge murale** (*time-of-day*) donne la date et l'heure selon un calendrier. Elle est synchronisée par **NTP**, donc elle peut **reculer** ou sauter brutalement quand elle est corrigée, et elle ignore les secondes intercalaires. Mauvaise pour mesurer des durées.
- **L'horloge monotone** ne revient jamais en arrière. Sa valeur absolue n'a **aucun sens** (secondes depuis le démarrage, par exemple) ; seule la **différence** entre deux lectures sur **la même machine** a un sens. C'est la bonne horloge pour un timeout, une durée de requête, un bail local. NTP peut tout au plus la ralentir ou l'accélérer de 0,05 %, sans saut.

Règle pratique : **durée → monotone** ; **date affichée à un humain → murale** ; **ordre entre deux machines → ni l'une ni l'autre** (voir plus bas).

## Pourquoi les horloges divergent

- Le **quartz** dérive : de l'ordre de 200 ppm, soit environ 17 secondes par jour ou 6 ms toutes les 30 secondes.
- NTP n'est précis qu'à la mesure du **délai réseau**, jamais meilleur que quelques dizaines de millisecondes sur Internet, et pire en cas de congestion.
- Un pare-feu qui bloque NTP, un serveur NTP faux, une machine virtuelle suspendue, un appareil mobile non maîtrisé : autant de sources de décalage.
- Les **secondes intercalaires** font passer une minute à 59 ou 61 secondes ; on les « lisse » parfois sur la journée.

Le piège est que, contrairement à un disque ou à un processeur en panne, une horloge fausse **ne plante rien**. Le système continue de fonctionner, avec des données silencieusement mal ordonnées. Si on dépend d'horloges synchronisées, il faut **surveiller les décalages** et exclure les nœuds qui dérivent trop.

## Dernier écrivain gagnant et horodatages

Tentation : résoudre un conflit d'écriture en gardant la valeur avec le plus grand horodatage (*last write wins*, LWW). Exemple : le client A écrit `x = 1` sur le nœud 1, puis le client B lit `x` et écrit `x = 2` sur le nœud 2 : l'écriture de B est causalement **après**. Mais si l'horloge du nœud 2 retarde de quelques millisecondes, `x = 2` a un horodatage **plus petit** que `x = 1`, et la base garde `x = 1` : l'écriture de B est **perdue**, sans erreur.

Autres défauts : LWW ne distingue pas écritures **séquentielles** et **concurrentes** ; deux nœuds peuvent produire le même horodatage (il faut départager).

## Horloges logiques

Une **horloge logique** n'essaie pas de mesurer le temps mais de **ordonner** les événements. Un compteur par nœud, incrémenté à chaque événement. À la réception d'un message, le nœud prend le **maximum** entre son compteur et celui reçu, plus un (horloge de Lamport) ; l'ordre est cohérent avec la causalité. Départage des égalités par l'identifiant du nœud. Pour détecter précisément la concurrence, on passe aux vecteurs de version (module 06) ; avec une horloge de Lamport seule on ne peut pas dire si deux événements sont concurrents, seulement les ordonner de façon cohérente.

## Une lecture d'horloge est un intervalle

Un « timestamp » donne une fausse impression de précision. Une lecture honnête est un **intervalle de confiance** : l'heure réelle est entre `earliest` et `latest`. **TrueTime** de Google Spanner expose exactement cela, avec des horloges GPS et atomiques dans chaque centre de données, ce qui garde l'incertitude autour de quelques millisecondes.

Si l'intervalle de A est entièrement avant celui de B (A.latest < B.earliest), alors A s'est **sûrement** produit avant B. Si les intervalles **se chevauchent**, on ne peut pas trancher. Pour garantir l'ordre de transactions, Spanner utilise le **commit-wait** : avant de valider une transaction à l'horodatage *t*, il attend que *t* soit sûrement passé, soit environ la **largeur de l'intervalle** (≈ 7 ms en moyenne chez Google). Ainsi, toute transaction qui démarre ensuite obtient un intervalle qui ne chevauche pas le précédent. Bémol : sans matériel dédié, cette précision n'est pas à portée.

## Pièges fréquents

- **Mesurer une durée avec l'horloge murale** : un saut NTP donne une durée négative.
- **Utiliser LWW avec `time.Now()`** comme source de vérité d'ordre.
- **Comparer un horodatage d'une autre machine** avec celui de la tienne sans tenir compte de l'incertitude.
- **Supposer qu'un identifiant de type Snowflake** (qui contient l'heure) garantit la causalité.

## À retenir

- Murale pour afficher, monotone pour mesurer, logique pour ordonner.
- Les horloges dérivent et mentent sans bruit ; surveille leur décalage.
- LWW avec horodatages réels perd des écritures ; une horloge de Lamport donne un ordre cohérent avec la causalité.
- Une lecture d'horloge est un intervalle ; deux intervalles qui se chevauchent ne s'ordonnent pas ; commit-wait attend la largeur de l'intervalle.
