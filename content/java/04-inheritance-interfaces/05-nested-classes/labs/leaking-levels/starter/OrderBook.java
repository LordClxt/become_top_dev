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

    /** Un niveau de prix agrégé, envoyé aux clients et gardé en cache par la diffusion. */
    public class Level {
        private final long priceCents;
        private final long quantity;

        Level(long priceCents, long quantity) {
            this.priceCents = priceCents;
            this.quantity = quantity;
        }

        public long priceCents() { return priceCents; }

        public long quantity() { return quantity; }

        @Override
        public String toString() {
            return quantity + " @ " + priceCents / 100 + "." + String.format("%02d", priceCents % 100) + " " + currency;
        }
    }

    /** Les niveaux, construits à partir des prix et quantités donnés. */
    public List<Level> levels(long[][] priceAndQuantity) {
        List<Level> out = new ArrayList<>();
        for (long[] pq : priceAndQuantity) out.add(new Level(pq[0], pq[1]));
        out.sort(byPrice());
        return out;
    }

    /** Du meilleur prix au moins bon. */
    public Comparator<Level> byPrice() {
        return new Comparator<>() {
            @Override
            public int compare(Level a, Level b) {
                int c = Long.compare(a.priceCents, b.priceCents);
                return descending ? -c : c;
            }
        };
    }
}
