## Où on en est

Le jalon 1 a posé `Money`, `Order` et `OrderJournal` (le code est repris tel quel). Ce jalon prépare le moteur de matching du module 11 : il lui faut des montants qu'on peut **comparer** et un côté de carnet **trié**.

## M1 — Les contrats de `Money`

- `equals` / `hashCode` : même devise et même nombre d'unités mineures.
- `Money implements Comparable<Money>` : ordre par montant. Comparer deux devises différentes n'a pas de sens : `IllegalArgumentException` (dans les deux sens). Ordre **cohérent avec `equals`**.
- Le format de `toString` (`12.50 EUR`, `-0.05 USD`, `1500 JPY`) devient **spécifié** : documente-le, et ajoute la fabrique inverse `Money.valueOf(String)` qui le relit, avec aller-retour garanti (`valueOf(m.toString()).equals(m)`). Texte illisible ou devise inconnue : `IllegalArgumentException` citant le texte.

## M2 — `BookSide`, la priorité prix-temps

Un côté (achat ou vente) du carnet d'un symbole, pour les ordres **à cours limité** :

```java
BookSide bids = BookSide.of(Side.BUY, "ACME");
bids.add(order);            // ordre au marché, autre côté, autre symbole ou autre devise : IllegalArgumentException
bids.best();                // Optional<Order> : l'ordre prioritaire
bids.orders();              // List<Order> dans l'ordre de priorité (non modifiable)
bids.remove("ord-7");       // true s'il était présent
bids.size();
```

Priorité :
1. **meilleur prix** : le plus **haut** pour les achats, le plus **bas** pour les ventes ;
2. à prix égal, le **premier arrivé** (ordre des appels à `add`) ;
3. deux ordres différents ne sont **jamais** confondus, même de même prix et même quantité.

Un même identifiant ne peut être ajouté deux fois (`IllegalArgumentException`). Tous les ordres d'un côté ont la même devise (celle du premier ordre ajouté).

## M3 — Instantanés et affichage

- `BookSide.copyOf(BookSide)` : une copie **indépendante**. Ajouter ou retirer dans l'une ne touche pas l'autre, et la priorité temporelle est conservée (un ordre ajouté à la copie passe après ceux qu'elle contenait déjà).
- `toString` (format libre, à annoncer comme tel) : un **résumé**, jamais la liste complète, qui peut contenir des milliers d'ordres : `BUY ACME : 3 ordres, meilleur 12.50 EUR` ; `SELL ACME : vide`.
