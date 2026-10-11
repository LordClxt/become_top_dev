## Contexte

Tu rejoins l'équipe d'une plateforme de microblogging et tu dois décider comment produire le **fil d'accueil**. Avant d'écrire du code de production, tu écris un modèle de coût : combien d'opérations par seconde coûte chaque stratégie sous une charge donnée ? C'est ce raisonnement, avec des nombres, qui permet de défendre un choix d'architecture.

## Les trois stratégies

| Stratégie | Publier un tweet | Lire un fil |
|---|---|---|
| `ReadFanIn` (assembler à la lecture) | 1 écriture (collection globale) | `AvgFollowing` recherches (une par compte suivi) |
| `WriteFanOut` (préparer à l'écriture) | autant d'écritures que d'abonnés de l'auteur | 1 recherche |
| `Hybrid` | comme `WriteFanOut`, mais **1 seule écriture** pour une célébrité | 1 recherche, plus 1 par célébrité suivie |

Une **célébrité** est un compte qui a **strictement plus** d'abonnés que `CelebrityThreshold`.

## Ta mission

Dans `fanout.go`, implémente :

### `Cost.Total() float64`
Écritures + lectures par seconde.

### `Estimate(s Strategy, w Workload) Cost`
Le coût **moyen** par seconde de la stratégie. `w.Followers` liste le nombre d'abonnés de chaque compte qui publie (chaque entrée publie au même rythme) : le nombre moyen d'écritures par tweet est la moyenne, sur cette liste, du coût d'un tweet selon la stratégie. Ensuite :

- `WritesPerSec = TweetsPerSec × (écritures moyennes par tweet)`
- `ReadsPerSec = TimelineReadsPerSec × (recherches par lecture)`

Sans compte qui publie (`Followers` vide), la moyenne d'écritures est 0.

### `MaxFanOut(s Strategy, w Workload) int`
Le plus grand nombre d'écritures déclenchées par **un seul tweet** : la rafale du pire cas. Sans compte qui publie : 0.

## Ce que les tests vérifient

- Les chiffres de **Twitter en 2012** : 4,6 k tweets/s, 300 k lectures/s, 75 abonnés en moyenne → 345 k écritures/s pour `WriteFanOut`.
- Une distribution **déséquilibrée** (99 comptes à 10 abonnés, une célébrité à 30 millions) : la moyenne cache la célébrité, et le fan-out pur explose.
- Que l'approche hybride réduit le coût de plusieurs ordres de grandeur.
- Que le seuil est **exclusif**.

## Contrainte

Une seule fonction pour le coût d'un tweet (par stratégie) évite de répéter la logique dans `Estimate` et `MaxFanOut`.
