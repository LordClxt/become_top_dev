import java.util.Objects;

/** La clé d'un titre : sa place de cotation et son symbole. Sert de clé dans les ensembles et les tables. */
public final class SymbolKey {
    private final String venue;
    private final String symbol;

    public SymbolKey(String venue, String symbol) {
        this.venue = Objects.requireNonNull(venue, "venue");
        this.symbol = Objects.requireNonNull(symbol, "symbol");
    }

    public boolean equals(SymbolKey other) {
        return other != null && venue.equals(other.venue) && symbol.equals(other.symbol);
    }

    public int hashcode() {
        return Objects.hash(venue, symbol);
    }

    public String tostring() {
        return venue + ":" + symbol;
    }
}
