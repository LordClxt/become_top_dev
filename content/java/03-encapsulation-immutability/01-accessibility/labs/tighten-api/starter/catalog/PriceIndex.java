package catalog;

import java.util.Comparator;
import java.util.Optional;
import java.util.TreeSet;

/** Index des produits par prix croissant. Utilisé par Catalog uniquement. */
public class PriceIndex {
    public final TreeSet<Product> byPrice =
            new TreeSet<>(Comparator.comparingLong(Product::priceCents).thenComparing(Product::name));

    public void add(Product p) { byPrice.add(p); }

    public void clear() { byPrice.clear(); }

    public Optional<Product> cheapest() {
        return byPrice.isEmpty() ? Optional.empty() : Optional.of(byPrice.first());
    }
}
