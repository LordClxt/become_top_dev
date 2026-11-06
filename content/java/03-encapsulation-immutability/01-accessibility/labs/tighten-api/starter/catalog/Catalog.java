package catalog;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/** Le catalogue : produits rangés par nom, avec un index par prix. */
public class Catalog {
    public static final String[] CATEGORIES = {"épicerie", "frais", "boissons"};

    public final List<Product> products = new ArrayList<>();
    protected PriceIndex index = new PriceIndex();

    public void add(Product p) {
        if (!Arrays.asList(CATEGORIES).contains(p.category())) {
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

    public List<Product> products() {
        return products;
    }

    /** Reconstruit l'index ; utile dans les tests. */
    public void rebuildIndexForTests() {
        index.clear();
        products.forEach(index::add);
    }
}
