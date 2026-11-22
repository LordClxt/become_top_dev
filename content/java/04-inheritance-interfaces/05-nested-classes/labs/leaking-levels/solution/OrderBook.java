import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Un côté du carnet d'ordres : gros (tous les ordres d'une journée), remplacé à chaque mise à jour. */
public final class OrderBook {
    private final long[] orders;          // tous les ordres : plusieurs mégaoctets
    private final String currency;
    private final boolean descending;     // vrai pour les achats (meilleur prix = le plus haut)

    public OrderBook(String currency, boolean descending, int orderCount) {
        this.currency = currency;
        this.descending = descending;
        this.orders = new long[orderCount];
    }

    /**
     * Un niveau de prix agrégé, envoyé aux clients et gardé en cache par la diffusion.
     * Statique : il n'a pas besoin du carnet, il reçoit sa devise. Il peut donc lui survivre sans le retenir.
     */
    public static final class Level {
        private final long priceCents;
        private final long quantity;
        private final String currency;

        Level(long priceCents, long quantity, String currency) {
            this.priceCents = priceCents;
            this.quantity = quantity;
            this.currency = currency;
        }

        public long priceCents() { return priceCents; }

        public long quantity() { return quantity; }

        @Override
        public String toString() {
            return quantity + " @ " + priceCents / 100 + "." + String.format("%02d", priceCents % 100) + " " + currency;
        }
    }

    private static final Comparator<Level> ASCENDING = Comparator.comparingLong(Level::priceCents);
    private static final Comparator<Level> DESCENDING = ASCENDING.reversed();

    /** Les niveaux, construits à partir des prix et quantités donnés. */
    public List<Level> levels(long[][] priceAndQuantity) {
        List<Level> out = new ArrayList<>();
        for (long[] pq : priceAndQuantity) out.add(new Level(pq[0], pq[1], currency));
        out.sort(byPrice());
        return out;
    }

    /** Du meilleur prix au moins bon. Constantes statiques : le comparateur ne capture pas le carnet. */
    public Comparator<Level> byPrice() {
        return descending ? DESCENDING : ASCENDING;
    }
}
