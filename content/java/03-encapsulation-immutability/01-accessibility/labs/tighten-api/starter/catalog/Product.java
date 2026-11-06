package catalog;

import java.util.Objects;

/** Un produit du catalogue. */
public class Product {
    public String name;
    public long priceCents;
    public String category;

    Product(String name, long priceCents, String category) {
        this.name = name;
        this.priceCents = priceCents;
        this.category = category;
    }

    public static Product of(String name, long priceCents, String category) {
        if (priceCents < 0) throw new IllegalArgumentException("prix négatif : " + priceCents);
        return new Product(Objects.requireNonNull(name), priceCents, Objects.requireNonNull(category));
    }

    public String name() { return name; }

    public long priceCents() { return priceCents; }

    public String category() { return category; }

    @Override
    public String toString() {
        return name + " (" + priceCents + " c)";
    }
}
