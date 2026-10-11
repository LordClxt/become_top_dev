## Contexte

Ton équipe prépare un engagement de service (SLA) : « 99,9 % de disponibilité ». Avant de le signer, il faut savoir ce que cela représente en minutes d'arrêt, combien de disques vont tomber en panne, et si l'architecture envisagée (des composants en série, d'autres redondants) peut tenir la promesse. Tu écris la petite calculatrice de fiabilité.

## Ta mission

Dans `availability.go`, implémente six fonctions.

### `DiskFailuresPerDay(disks int, mttfYears float64) float64`
Le nombre moyen de pannes de disque par jour dans un parc : `disks / (mttfYears × 365)`. Avec 10 000 disques de MTTF 27,4 ans, on attend environ **un disque par jour**. Renvoie 0 si `disks` ou `mttfYears` n'est pas strictement positif.

### `SeriesAvailability(availabilities ...float64) float64`
Composants **tous nécessaires** (une panne de l'un entraîne celle de l'ensemble) : le produit des disponibilités. Sans composant : `1`.

### `ParallelAvailability(availabilities ...float64) float64`
Composants **redondants** (un seul suffit) : `1 − Π(1 − aᵢ)`. Sans composant : `0`. Les pannes sont supposées **indépendantes**.

### `DowntimePerYear(availability float64) time.Duration`
L'indisponibilité annuelle (année de 365 jours) pour une disponibilité entre 0 et 1, arrondie à la milliseconde. Une valeur hors de `[0, 1]` est ramenée dans cet intervalle. `0,999` donne 8 h 45 min 36 s.

### `RequiredAvailability(maxDowntime time.Duration) float64`
L'opération inverse : la disponibilité minimale pour ne pas dépasser `maxDowntime` d'arrêt par an (entre 0 et 1).

### `Nines(availability float64) int`
Le nombre de « neuf » : `0,9 → 1`, `0,99 → 2`, `0,999 → 3`. Une disponibilité inférieure à 0,9 vaut 0, et une disponibilité parfaite (`≥ 1`) vaut 15.

## Pièges

- La comparaison de flottants : `0.999` n'est pas exactement représentable. Pour `Nines`, un calcul par logarithme doit tolérer une erreur d'arrondi.
- `time.Duration` est un `int64` de nanosecondes : convertis avec soin entre secondes flottantes et durée.
