import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Cache des prix unitaires par (produit, options). */
public final class PriceCache {
    private final Map<PriceKey, Long> prices = new HashMap<>();
    private final Pricing pricing;
    private int hits;
    private int misses;

    public PriceCache(Pricing pricing) {
        this.pricing = pricing;
    }

    public long unitPrice(Sku sku, List<String> options) {
        PriceKey key = new PriceKey(sku, options);
        Long cached = prices.get(key);
        if (cached != null) {
            hits++;
            return cached;
        }
        misses++;
        long price = pricing.compute(sku, options);
        prices.put(key, price);
        return price;
    }

    public int hits() { return hits; }

    public int misses() { return misses; }

    public int size() { return prices.size(); }
}
