## Contexte

Le framework maison impose que toute entité hérite de `Entity` (tu ne peux pas modifier ce fichier). Son constructeur inscrit chaque nouvelle entité dans le journal d'audit, avec une description obtenue en appelant `describe()`, une méthode que les sous-classes redéfinissent.

Deux tickets sont ouverts sur `Account` :

1. le journal d'audit contient des lignes `Account null (null)` ;
2. quand on crée un compte avec un IBAN invalide, l'exception arrive bien… mais **après** l'inscription au journal : l'audit contient des comptes qui n'ont jamais existé.

## Ta mission

Corrige `Account.java`, et seulement lui :

- l'IBAN est normalisé (espaces retirés, majuscules) puis validé : deux lettres, deux chiffres, puis 11 à 30 lettres ou chiffres ;
- le titulaire est non vide après `strip()` (et stocké sans espaces autour) ;
- un argument invalide lève `IllegalArgumentException` **sans que rien ne soit écrit au journal** ; un argument `null` lève `NullPointerException`, sans rien écrire non plus ;
- le journal reçoit `Account FR7630006000011234567890189 (Ada Lovelace)` pour `new Account("fr76 3000 6000 0112 3456 7890 189", " Ada Lovelace ")` ;
- les champs restent `final`.

Pas le droit de modifier `Entity` ni de supprimer l'appel à `describe()`.
