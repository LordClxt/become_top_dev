## Ordo, jalon 0

Ordo est le moteur de carnet d'ordres que tu construis tout au long du cours. Avant de faire se rencontrer acheteurs et vendeurs (modules suivants), il lui faut une porte d'entrée : une **console**.

```text
buy 100 AIR @ 12.50
sell 50 AIR @ 12.6
book air
cancel 1
quit
```

Fournis : `Side` (`BUY`, `SELL`), `Reply` (les réponses de la session) et `Level` (un niveau de prix du carnet).

### Jalon 1 : les commandes (`Command.java`, `CommandParser.java`)

`Command` est une interface scellée : `Place(Side side, String symbol, long qty, long limitCents)`, `Cancel(long orderId)`, `Book(String symbol)`, `Quit()`.

- Chaque record valide ses composants (`IllegalArgumentException`, `NullPointerException` pour `null`) : symbole de 1 à 5 lettres majuscules, quantité, prix et identifiant > 0.
- `CommandParser.parse(String line)` reconnaît, sans tenir compte de la casse des mots-clés ni des espaces en trop :
  - `buy|sell QUANTITÉ SYMBOLE @ PRIX` : le symbole est mis en majuscules ; le prix s'écrit `12`, `12.5` ou `12.50`, et devient **exactement** 1250 centimes (jamais de `double`) ; plus de deux décimales, une virgule ou un signe : erreur ;
  - `cancel ID`, `book SYMBOLE`, `quit`.
- Toute autre ligne lève `IllegalArgumentException` avec un message qui dit ce qui ne va pas.

### Jalon 2 : la session (`Session.java`)

`Reply handle(Command command)` :

- `Place` : l'ordre est accepté et numéroté à partir de 1 → `Accepted(id)` ;
- `Cancel` : un ordre vivant est retiré → `Cancelled(id)` ; sinon `Rejected("ordre inconnu : " + id)` ;
- `Book` : `BookView(symbole, asks, bids)`, les quantités des ordres vivants **agrégées par prix** ; `asks` (ventes) du moins cher au plus cher, `bids` (achats) du plus cher au moins cher ; listes non modifiables ;
- `Quit` : `Bye()` ; ensuite, toute commande reçoit `Rejected("session fermée")`.

Pas d'appariement des ordres à ce jalon : ils s'accumulent dans le carnet.

### Jalon 3 : la console (`Console.java`)

`static String run(String script)` traite le script ligne par ligne avec une nouvelle session et renvoie le transcript, une ligne par réponse :

| réponse | ligne(s) |
|---|---|
| `Accepted(1)` | `ordre 1 accepté` |
| `Cancelled(1)` | `ordre 1 annulé` |
| `Rejected(r)` | `refusé : r` |
| `Bye()` | `au revoir` |
| `BookView` | `carnet AIR`, puis `  vente QTÉ @ PRIX` du plus cher au moins cher, puis `  achat QTÉ @ PRIX` du plus cher au moins cher (prix `12.50`) ; carnet sans ordre : `carnet AIR vide` |

Une ligne illisible produit `ligne N : <message>` (N compte toutes les lignes du script, à partir de 1) et le script continue. Les lignes vides et les commentaires `#` sont ignorés. Après `quit`, les lignes restantes ne sont plus lues. Chaque ligne du transcript se termine par `\n`.
