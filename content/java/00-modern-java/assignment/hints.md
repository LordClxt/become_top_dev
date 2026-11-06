## Hint 1
Sépare deux étapes : **lire** le texte en une liste de règles typées (une interface scellée, un record par sorte de règle, validé dans son constructeur compact), puis **appliquer** ces règles aux colis.

## Hint 2
Pour appliquer, un `switch` exhaustif sur la règle, sans `default` : `case Tier(int min, int max, long price) when …`, `case Surcharge(Zone z, long price) when z == parcel.zone() -> …`. Les vérifications qui portent sur l'ensemble (chevauchement de paliers, doublons) se font après la lecture, avec le numéro de ligne gardé dans chaque règle ou à côté.

## Hint 3
Une `LinkedHashMap` garde l'ordre des colis ; enveloppe-la dans `Collections.unmodifiableSequencedMap` (ou copie-la) avant de la mettre dans le `Quote`. Pour les nombres, `Integer.parseInt` dans un `try` qui transforme `NumberFormatException` en `IllegalArgumentException("ligne " + n + " : …")`.
