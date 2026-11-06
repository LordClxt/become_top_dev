## Contexte

La boutique veut que l'équipe commerciale règle elle-même les frais de port, sans redéployer. Les règles arrivent sous forme de texte :

```text
# barème 2026
tier 0-500 490
tier 501-2000 790
tier 2001-30000 1590
surcharge EU 300
surcharge WORLD 1200
fragile 250
discount 10 from 3
```

| règle | sens |
|---|---|
| `tier MIN-MAX PRIX` | prix de base (centimes) d'un colis dont le poids en grammes est dans `[MIN, MAX]` |
| `surcharge ZONE PRIX` | supplément par colis envoyé dans cette zone (`FR`, `EU`, `WORLD`) |
| `fragile PRIX` | supplément par colis fragile |
| `discount POURCENT from N` | à partir de N colis, remise de POURCENT % sur le total (arrondie au centime inférieur en faveur du client : on retire `total * POURCENT / 100`, division entière) |

`Parcel`, `Zone` et `Quote` sont fournis.

## Ta mission

Écris `Shipping.quote(String rules, List<Parcel> parcels)`, qui renvoie un `Quote` :

- `perParcel` : le prix de chaque colis (base + suppléments), dans l'ordre des colis, non modifiable ;
- `discount` : le montant de la remise (0 sinon) ;
- `total` : la somme des colis moins la remise.

## Règles de validation

Toutes les erreurs lèvent `IllegalArgumentException` avec un message utile :

- configuration : mot-clé inconnu, nombre de champs incorrect, nombre illisible, prix ou pourcentage négatif, pourcentage > 100, paliers qui se chevauchent, zone inconnue, deux `surcharge` pour la même zone, plusieurs `fragile` ou `discount`. Le message commence par `ligne N :` (numéro dans le texte, à partir de 1) ;
- colis : poids couvert par aucun palier (le message nomme le colis), identifiant en double.

Lignes vides et commentaires `#` ignorés ; les espaces en trop autour des champs aussi.

## Ce qui sera relu

Au-delà des tests, la revue juge le **modèle** : une fois le texte lu, les règles ne devraient plus être des chaînes, mais des types que le compilateur connaît. Et l'ajout d'une sorte de règle devrait être signalé par le compilateur partout où il faut la traiter.
