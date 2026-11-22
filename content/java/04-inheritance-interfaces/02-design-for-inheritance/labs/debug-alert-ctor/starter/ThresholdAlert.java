import java.util.Objects;

/** Se déclenche quand le prix atteint un seuil. */
public class ThresholdAlert extends Alert {
    private final String symbol;
    private final long thresholdCents;

    public ThresholdAlert(String name, String symbol, long thresholdCents) {
        super(name);
        this.symbol = Objects.requireNonNull(symbol, "symbol");
        this.thresholdCents = thresholdCents;
    }

    @Override
    protected String describe() {
        return symbol.toUpperCase() + " ≥ " + thresholdCents;
    }

    @Override
    public boolean triggeredBy(long priceCents) {
        return priceCents >= thresholdCents;
    }
}
