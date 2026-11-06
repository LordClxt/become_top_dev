## Où on en est

Les jalons 1 et 2 ont posé `Money`, `Order`, `OrderJournal` et `BookSide` (le code est repris tel quel). Le moteur de matching (module 11) va tourner sur plusieurs threads : un thread de matching, des threads de diffusion du carnet, des threads de reporting. Plutôt que de tout verrouiller, on rend **immuable** tout ce qui circule entre eux.

## M1 — `Trade`, un record validé

Une transaction est le résultat d'une rencontre entre un ordre d'achat et un ordre de vente :

```java
Trade t = new Trade("b-1", "s-7", "ACME", 30, Money.parse("12.50", Currency.EUR), Instant.parse("2026-01-05T09:30:00Z"));
t.notional();   // 375.00 EUR
```

- `Trade` devient un **record**, validé dans son constructeur compact : aucun composant `null` (`NullPointerException`) ; les deux identifiants différents, symbole de 1 à 5 lettres majuscules, quantité et prix strictement positifs (`IllegalArgumentException`).
- `Money.times(long factor)` renvoie un nouveau montant ; un débordement lève `ArithmeticException` ; multiplier par 0 donne le zéro unique de la devise.

## M2 — Exécuter sans modifier

`order.fill(quantity)` exécute une partie de l'ordre et renvoie **un nouvel ordre**. L'ordre d'origine ne change jamais (il est peut-être en train d'être lu par le journal ou la diffusion).

- `quantity()` est désormais la quantité **restante** ; `originalQuantity()` et `filledQuantity()` complètent ;
- `isFilled()` quand il ne reste rien ;
- `fill` hors de `[1, restant]` : `IllegalArgumentException` ; exécution partielle d'un ordre all-or-none : `IllegalStateException` ;
- identifiant, côté, symbole, limite et drapeau AON sont conservés ; `Order` reste final avec des champs `private final`.

## M3 — Des instantanés du carnet

`bookSide.snapshot()` renvoie un `BookSnapshot` : les niveaux de prix agrégés, **du meilleur au moins bon**, chacun avec la quantité restante totale et le nombre d'ordres.

```java
// achats : 3 @ 10.00, 2 @ 10.50, 4 @ 10.00
bids.snapshot().levels();  // [Level[10.50 EUR, 2, 1], Level[10.00 EUR, 7, 2]]
```

- Un instantané ne change **jamais**, quoi qu'il arrive ensuite au carnet, et sa liste n'est pas modifiable.
- `BookSnapshot` peut aussi être construit directement (tests, relecture d'un fichier). Son constructeur valide : niveaux **strictement** ordonnés selon le côté (sinon `IllegalArgumentException`), et un `Level` a un prix positif, une quantité positive et un nombre d'ordres entre 1 et la quantité. La liste fournie par l'appelant peut être modifiée ensuite sans effet sur l'instantané.
