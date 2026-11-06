import java.util.List;

/** Réponse de la session à une commande. NE PAS MODIFIER. */
sealed interface Reply permits Accepted, Cancelled, Rejected, BookView, Bye { }

record Accepted(long orderId) implements Reply { }

record Cancelled(long orderId) implements Reply { }

record Rejected(String reason) implements Reply { }

/** Le carnet d'un symbole : ventes du moins cher au plus cher, achats du plus cher au moins cher. */
record BookView(String symbol, List<Level> asks, List<Level> bids) implements Reply {
    BookView {
        asks = List.copyOf(asks);
        bids = List.copyOf(bids);
    }
}

record Bye() implements Reply { }

/** Un niveau de prix du carnet : quantité totale des ordres vivants à ce prix. */
record Level(long priceCents, long qty) { }
