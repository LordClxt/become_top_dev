import java.util.Optional;

/** Un ordre d'achat ou de vente. Immuable, construit par {@link Builder}. */
public final class Order {

    // TODO : champs, constructeur privé qui reçoit le builder.

    public String id() { throw new UnsupportedOperationException("id à écrire"); }

    public Side side() { throw new UnsupportedOperationException("side à écrire"); }

    public String symbol() { throw new UnsupportedOperationException("symbol à écrire"); }

    public long quantity() { throw new UnsupportedOperationException("quantity à écrire"); }

    public Optional<Money> limit() { throw new UnsupportedOperationException("limit à écrire"); }

    public boolean isMarket() { throw new UnsupportedOperationException("isMarket à écrire"); }

    public boolean isAllOrNone() { throw new UnsupportedOperationException("isAllOrNone à écrire"); }

    @Override
    public String toString() { throw new UnsupportedOperationException("toString à écrire"); }

    public static final class Builder {
        public Builder(String id, Side side, String symbol) {
            // TODO
        }

        public Builder quantity(long quantity) { throw new UnsupportedOperationException("quantity à écrire"); }

        public Builder limit(Money price) { throw new UnsupportedOperationException("limit à écrire"); }

        public Builder allOrNone() { throw new UnsupportedOperationException("allOrNone à écrire"); }

        public Order build() { throw new UnsupportedOperationException("build à écrire"); }
    }
}
