## Contexte

`OrderStatus` a remplacé les anciennes constantes `int`. Mais la nouvelle passerelle d'échange a ajouté le statut `REJECTED`, et depuis : son code s'affiche `?`, un ordre rejeté est considéré comme encore vivant, et `fromCode` renvoie `NEW` pour un code inconnu, ce qui fait réapparaître des ordres fantômes. Les deux `switch (this)` n'ont pas suivi l'ajout de la constante.

Codes : `N` (nouveau), `P` (partiellement exécuté), `F` (exécuté), `C` (annulé), `R` (rejeté). Sont terminaux : exécuté, annulé et rejeté.

## Ta mission

1. Chaque statut porte lui-même son code et le fait d'être terminal, de sorte qu'**ajouter une constante sans les donner ne compile pas**.
2. `fromCode` retrouve chaque statut par son code, et renvoie `Optional.empty()` pour un code inconnu.

Ne modifie que `OrderStatus.java`.
