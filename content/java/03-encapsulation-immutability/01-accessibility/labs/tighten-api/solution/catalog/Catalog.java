package catalog;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.TreeSet;

/** Le catalogue : produits rangés par nom, avec un index par prix. */
public class Catalog {
    public static final List<String> CATEGORIES = List.of("épicerie", "frais", "boissons");

    /** Index des produits par prix croissant : détail d'implémentation, invisible même du paquetage. */
    private static final class PriceIndex {
        private final TreeSet<Product> byPrice =
                new TreeSet<>(Comparator.comparingLong(Product::priceCents).thenComparing(Product::name));

        void add(Product p) { byPrice.add(p); }

        void clear() { byPrice.clear(); }

        Optional<Product> cheapest() {
            return byPrice.isEmpty() ? Optional.empty() : Optional.of(byPrice.first());
        }
    }

    private final List<Product> products = new ArrayList<>();
    private final PriceIndex index = new PriceIndex();

    public void add(Product p) {
        if (!CATEGORIES.contains(p.category())) {
            throw new IllegalArgumentException("catégorie inconnue : " + p.category());
        }
        if (find(p.name()).isPresent()) throw new IllegalArgumentException("déjà présent : " + p.name());
        products.add(p);
        index.add(p);
    }

    public Optional<Product> find(String name) {
        return products.stream().filter(p -> p.name().equals(name)).findFirst();
    }

    public Optional<Product> cheapest() {
        return index.cheapest();
    }

    /** Vue non modifiable des produits, dans l'ordre d'ajout. */
    public List<Product> products() {
        return Collections.unmodifiableList(products);
    }

    /** Reconstruit l'index. Package-private : réservé aux tests du paquetage. */
    void rebuildIndexForTests() {
        index.clear();
        products.forEach(index::add);
    }
}
