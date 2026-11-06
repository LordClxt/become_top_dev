## Contexte

Le service de rappel téléphonique logue `Échec pour Contact@4554617c (FrenchPhone@1b6d3586)`. Tu donnes un `toString` utile aux trois classes, en choisissant pour chacune entre format **spécifié** et format **libre**.

## 1. `FrenchPhone` — format spécifié

`toString` renvoie **toujours** dix chiffres groupés par deux, séparés par des espaces : `06 12 34 56 78`. Documente-le dans la Javadoc.

Écris la fabrique inverse `parse`, qui accepte les écritures courantes et garantit l'**aller-retour** `parse(p.toString()).equals(p)` :

```java
FrenchPhone.parse("0612345678")
FrenchPhone.parse("06.12.34.56.78")
FrenchPhone.parse("06 12 34 56 78")
FrenchPhone.parse("+33 6 12 34 56 78")   // indicatif international : +33 remplace le 0
// toutes donnent "06 12 34 56 78"
FrenchPhone.parse("12345")               // IllegalArgumentException avec le texte refusé
```

Ajoute les accesseurs pour qu'aucun client n'ait à découper la chaîne : `digits()` (les 10 chiffres, `"0612345678"`) et `isMobile()` (vrai pour `06` et `07`).

## 2. `Contact` — format libre

Format non spécifié, à annoncer comme tel dans la Javadoc. Il doit contenir le **nom** et le **numéro** (sous sa forme `toString`), mais **jamais** le code PIN de la messagerie vocale, qui finirait dans les logs. Exemple : `Contact[nom=Ana Diaz, tél=06 12 34 56 78]`.

## 3. `Directory` — un résumé

Un annuaire peut contenir des centaines de milliers de contacts : `toString` renvoie un **résumé**, `Annuaire Paris (3 contacts)` (`1 contact` au singulier, `0 contact` quand il est vide).

`equals` et `hashCode` sont déjà écrits.
