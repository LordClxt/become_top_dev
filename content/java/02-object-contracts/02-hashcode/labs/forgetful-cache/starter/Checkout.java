import java.util.ArrayList;
import java.util.List;

/** Calcule le total d'un panier. */
public final class Checkout {
    private final PriceCache cache;

    public Checkout(PriceCache cache) {
        this.cache = cache;
    }

    public long total(List<Line> lines) {
        long total = 0;
        List<String> options = new ArrayList<>(); // réutilisée d'une ligne à l'autre : une allocation de moins
        for (Line line : lines) {
            options.clear();
            options.addAll(line.options());
            total += cache.unitPrice(Sku.of(line.skuCode()), options) * line.quantity();
        }
        return total;
    }
}
