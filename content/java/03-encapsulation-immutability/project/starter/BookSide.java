import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.TreeSet;

/** Un côté (achat ou vente) du carnet d'ordres d'un symbole, trié par priorité prix-temps. */
public final class BookSide {
    /** Un ordre et son rang d'arrivée : la séquence, unique, départage tous les prix égaux. */
    private record Entry(Order order, long sequence) {
        Money price() { return order.limit().orElseThrow(); }
    }

    private static final Comparator<Entry> BY_TIME = Comparator.comparingLong(Entry::sequence);

    private final Side side;
    private final String symbol;
    private final TreeSet<Entry> queue;
    private final Map<String, Entry> byId = new HashMap<>();
    private Currency currency;
    private long nextSequence;

    private BookSide(Side side, String symbol) {
        this.side = Objects.requireNonNull(side, "side");
        this.symbol = Objects.requireNonNull(symbol, "symbol");
        Comparator<Entry> byPrice = Comparator.comparing(Entry::price);
        if (side == Side.BUY) byPrice = byPrice.reversed(); // le plus offrant d'abord
        this.queue = new TreeSet<>(byPrice.thenComparing(BY_TIME));
    }

    public static BookSide of(Side side, String symbol) {
        return new BookSide(side, symbol);
    }

    public static BookSide copyOf(BookSide other) {
        BookSide copy = new BookSide(other.side, other.symbol);
        for (Entry e : other.queue) { // les Entry sont immuables : on peut les partager
            copy.queue.add(e);
            copy.byId.put(e.order().id(), e);
        }
        copy.currency = other.currency;
        copy.nextSequence = other.nextSequence;
        return copy;
    }

    public void add(Order order) {
        Objects.requireNonNull(order, "order");
        if (order.side() != side) throw new IllegalArgumentException("mauvais côté : " + order);
        if (!order.symbol().equals(symbol)) throw new IllegalArgumentException("mauvais symbole : " + order);
        Money price = order.limit().orElseThrow(() -> new IllegalArgumentException("ordre au marché refusé : " + order));
        if (currency != null && price.currency() != currency) throw new IllegalArgumentException("devise différente : " + order);
        if (byId.containsKey(order.id())) throw new IllegalArgumentException("identifiant déjà présent : " + order.id());
        Entry e = new Entry(order, nextSequence++);
        queue.add(e);
        byId.put(order.id(), e);
        currency = price.currency();
    }

    public boolean remove(String orderId) {
        Entry e = byId.remove(orderId);
        return e != null && queue.remove(e);
    }

    public Optional<Order> best() {
        return queue.isEmpty() ? Optional.empty() : Optional.of(queue.first().order());
    }

    public List<Order> orders() {
        return queue.stream().map(Entry::order).toList();
    }

    /** Un instantané immuable, agrégé par prix. TODO (M3). */
    public BookSnapshot snapshot() {
        throw new UnsupportedOperationException("TODO M3");
    }

    public int size() {
        return queue.size();
    }

    /** Résumé : « BUY ACME : 3 ordres, meilleur 12.50 EUR » ou « SELL ACME : vide ». Le format peut changer. */
    @Override
    public String toString() {
        if (queue.isEmpty()) return side + " " + symbol + " : vide";
        int n = queue.size();
        return side + " " + symbol + " : " + n + (n > 1 ? " ordres" : " ordre") + ", meilleur " + queue.first().price();
    }
}
