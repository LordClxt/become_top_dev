import java.util.Objects;
import java.util.Optional;
import java.util.regex.Pattern;

/** Un ordre d'achat ou de vente. Immuable, construit par {@link Builder}. */
public final class Order {
    private static final Pattern SYMBOL = Pattern.compile("[A-Z]{1,5}");

    private final String id;
    private final Side side;
    private final String symbol;
    private final long quantity;
    private final Money limit; // null = au marché
    private final boolean allOrNone;

    private Order(Builder b) {
        if (b.quantity == 0) throw new IllegalStateException("quantité obligatoire pour l'ordre " + b.id);
        if (b.limit == null && b.allOrNone) {
            throw new IllegalStateException("un ordre au marché ne peut pas être all-or-none : " + b.id);
        }
        this.id = b.id;
        this.side = b.side;
        this.symbol = b.symbol;
        this.quantity = b.quantity;
        this.limit = b.limit;
        this.allOrNone = b.allOrNone;
    }

    public String id() { return id; }

    public Side side() { return side; }

    public String symbol() { return symbol; }

    public long quantity() { return quantity; }

    public Optional<Money> limit() { return Optional.ofNullable(limit); }

    public boolean isMarket() { return limit == null; }

    public boolean isAllOrNone() { return allOrNone; }

    @Override
    public String toString() {
        return id + " " + side + " " + quantity + " " + symbol + " @ " + (limit == null ? "MKT" : limit)
                + (allOrNone ? " AON" : "");
    }

    public static final class Builder {
        private final String id;
        private final Side side;
        private final String symbol;
        private long quantity;
        private Money limit;
        private boolean allOrNone;

        public Builder(String id, Side side, String symbol) {
            this.id = Objects.requireNonNull(id, "id");
            this.side = Objects.requireNonNull(side, "side");
            this.symbol = Objects.requireNonNull(symbol, "symbol");
            if (!SYMBOL.matcher(symbol).matches()) throw new IllegalArgumentException("symbole invalide : " + symbol);
        }

        public Builder quantity(long quantity) {
            if (quantity <= 0) throw new IllegalArgumentException("quantité positive attendue : " + quantity);
            this.quantity = quantity;
            return this;
        }

        public Builder limit(Money price) {
            Objects.requireNonNull(price, "price");
            if (!price.isPositive()) throw new IllegalArgumentException("prix limite positif attendu : " + price);
            this.limit = price;
            return this;
        }

        public Builder allOrNone() {
            this.allOrNone = true;
            return this;
        }

        public Order build() {
            return new Order(this);
        }
    }
}
