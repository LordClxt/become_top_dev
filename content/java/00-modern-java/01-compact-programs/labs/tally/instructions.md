## Contexte

La boutique exporte ses ventes du jour, une ligne par vente : `article;quantité;prix_unitaire_en_centimes`. Le gérant veut un récapitulatif par article. Un stagiaire a commencé l'outil « à l'ancienne » dans `Tally.java`, puis il est parti.

```text
# export du 14/03
café;2;250
croissant;2;120

café;1;250
thé;x;300
```

doit afficher, avec `java Tally.java < ventes.txt` :

```text
ligne 6 ignorée : thé;x;300
café x3 = 7.50
croissant x2 = 2.40
TOTAL 9.90
```

## Ta mission

Réécris `Tally.java` en **fichier source compact** (aucune déclaration de classe, une méthode `void main()` d'instance), qui lit l'entrée standard avec `IO.readln()` et écrit avec `IO.println`.

## Règles

- Les lignes vides et celles qui commencent par `#` sont ignorées sans message.
- Une ligne invalide (pas exactement 3 champs, nombre illisible, quantité ≤ 0, prix négatif) affiche `ligne N ignorée : <ligne>` **au moment où elle est lue** (N commence à 1 et compte toutes les lignes), puis le traitement continue.
- À la fin : une ligne par article, **dans l'ordre de première apparition**, `article xQUANTITÉ = MONTANT`, puis `TOTAL MONTANT`. Les montants sont en euros avec deux décimales et un point (`7.50`).
- Les espaces autour des champs sont ignorés (`café ; 2 ; 250` est valide).
- Une entrée vide affiche seulement `TOTAL 0.00`.

Les tests lancent vraiment ton fichier avec `java Tally.java`, comme le ferait le gérant.
