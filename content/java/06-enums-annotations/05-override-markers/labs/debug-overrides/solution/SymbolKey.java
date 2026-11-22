import java.util.Objects;

/** La clé d'un titre : sa place de cotation et son symbole. Sert de clé dans les ensembles et les tables. */
public final class SymbolKey {
    private final String venue;
    private final String symbol;

    public SymbolKey(String venue, String symbol) {
        this.venue = Objects.requireNonNull(venue, "venue");
        this.symbol = Objects.requireNonNull(symbol, "symbol");
    }

    @Override
    public boolean equals(Object o) {
        return o instanceof SymbolKey other && venue.equals(other.venue) && symbol.equals(other.symbol);
    }

    @Override
    public int hashCode() {
        return Objects.hash(venue, symbol);
    }

    @Override
    public String toString() {
        return venue + ":" + symbol;
    }
}
