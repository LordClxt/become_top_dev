import java.util.List;
import java.util.Optional;

/** Un côté (achat ou vente) du carnet d'ordres d'un symbole, trié par priorité prix-temps. */
public final class BookSide {

    // TODO : champs, constructeur privé.

    public static BookSide of(Side side, String symbol) {
        throw new UnsupportedOperationException("of à écrire");
    }

    /** Copie indépendante, qui conserve la priorité temporelle. */
    public static BookSide copyOf(BookSide other) {
        throw new UnsupportedOperationException("copyOf à écrire");
    }

    public void add(Order order) {
        throw new UnsupportedOperationException("add à écrire");
    }

    public boolean remove(String orderId) {
        throw new UnsupportedOperationException("remove à écrire");
    }

    public Optional<Order> best() {
        throw new UnsupportedOperationException("best à écrire");
    }

    public List<Order> orders() {
        throw new UnsupportedOperationException("orders à écrire");
    }

    public int size() {
        throw new UnsupportedOperationException("size à écrire");
    }
}
