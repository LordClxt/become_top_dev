import java.util.List;
import java.util.Objects;

/** Clé du cache de prix : un produit et ses options, dans l'ordre choisi. */
public final class PriceKey {
    private final Sku sku;
    private final List<String> options;

    public PriceKey(Sku sku, List<String> options) {
        this.sku = Objects.requireNonNull(sku);
        this.options = Objects.requireNonNull(options);
    }

    @Override
    public boolean equals(Object o) {
        return o instanceof PriceKey k && Objects.equals(k.sku, sku) && Objects.equals(k.options, options);
    }

    @Override
    public int hashCode() {
        return 31 * sku.hashCode() + options.hashCode();
    }
}
