import java.util.Objects;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Un ordre d'achat ou de vente. Immuable : une exécution partielle produit un nouvel ordre ({@link #fill(long)}),
 * l'original reste tel qu'il a été accepté.
 */
public final class Order {
    private static final Pattern SYMBOL = Pattern.compile("[A-Z]{1,5}");

    private final String id;
    private final Side side;
    private final String symbol;
    private final long originalQuantity;
    private final long filled;
    private final Pricing pricing;
    private final boolean allOrNone;

    private Order(Builder b) {
        if (b.quantity == 0) throw new IllegalStateException("quantité obligatoire pour l'ordre " + b.id);
        if (b.pricing instanceof Pricing.Market && b.allOrNone) {
            throw new IllegalStateException("un ordre au marché ne peut pas être all-or-none : " + b.id);
        }
        this.id = b.id;
        this.side = b.side;
        this.symbol = b.symbol;
        this.originalQuantity = b.quantity;
        this.filled = 0;
        this.pricing = b.pricing;
        this.allOrNone = b.allOrNone;
    }

    /** Copie avec une quantité exécutée différente ; tout le reste est partagé (immuable). */
    private Order(Order o, long filled) {
        this.id = o.id;
        this.side = o.side;
        this.symbol = o.symbol;
        this.originalQuantity = o.originalQuantity;
        this.filled = filled;
        this.pricing = o.pricing;
        this.allOrNone = o.allOrNone;
    }

    public String id() { return id; }

    public Side side() { return side; }

    public String symbol() { return symbol; }

    /** La quantité restant à exécuter. */
    public long quantity() { return originalQuantity - filled; }

    public long originalQuantity() { return originalQuantity; }

    public long filledQuantity() { return filled; }

    public boolean isFilled() { return filled == originalQuantity; }

    public Optional<Money> limit() {
        return pricing instanceof Pricing.Limit(Money price) ? Optional.of(price) : Optional.empty();
    }

    public boolean isMarket() { return pricing instanceof Pricing.Market; }

    public boolean isAllOrNone() { return allOrNone; }

    /** Au marché, ou avec une limite. */
    public Pricing pricing() { return pricing; }

    /**
     * Vrai si l'ordre accepte d'être exécuté à ce prix : toujours au marché ; à la limite ou mieux sinon
     * (pas plus cher pour un achat, pas moins cher pour une vente).
     *
     * @throws IllegalArgumentException si le prix n'est pas dans la devise de la limite
     */
    public boolean accepts(Money tradePrice) {
        java.util.Objects.requireNonNull(tradePrice, "tradePrice");
        return switch (pricing) {
            case Pricing.Market m -> true;
            case Pricing.Limit(Money limit) -> side == Side.BUY ? tradePrice.compareTo(limit) <= 0 : tradePrice.compareTo(limit) >= 0;
        };
    }

    /**
     * Exécute {@code quantity} unités et renvoie l'ordre résultant ; cet ordre-ci ne change pas.
     *
     * @throws IllegalArgumentException si la quantité n'est pas dans [1, quantité restante]
     * @throws IllegalStateException si l'ordre est all-or-none et que l'exécution est partielle
     */
    public Order fill(long quantity) {
        long remaining = quantity();
        if (quantity < 1 || quantity > remaining) {
            throw new IllegalArgumentException("quantité à exécuter hors de [1, " + remaining + "] : " + quantity);
        }
        if (allOrNone && quantity != remaining) {
            throw new IllegalStateException("exécution partielle d'un ordre all-or-none : " + id);
        }
        return new Order(this, filled + quantity);
    }

    @Override
    public String toString() {
        return id + " " + side + " " + quantity() + (filled > 0 ? "/" + originalQuantity : "") + " " + symbol + " @ "
                + (isMarket() ? "MKT" : limit().orElseThrow()) + (allOrNone ? " AON" : "");
    }

    public static final class Builder {
        private final String id;
        private final Side side;
        private final String symbol;
        private long quantity;
        private Pricing pricing = Pricing.market();
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
            this.pricing = Pricing.limit(price);   // le record valide le prix
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
