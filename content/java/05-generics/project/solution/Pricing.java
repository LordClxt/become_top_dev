import java.util.Objects;

/**
 * Comment un ordre fixe son prix : au marché, ou avec une limite. Deux sortes, décidées par Ordo :
 * une interface scellée, un record par sorte.
 */
public sealed interface Pricing {
    static Pricing market() {
        return new Market();
    }

    static Pricing limit(Money price) {
        return new Limit(price);
    }

    record Market() implements Pricing { }

    record Limit(Money price) implements Pricing {
        public Limit {
            Objects.requireNonNull(price, "price");
            if (!price.isPositive()) throw new IllegalArgumentException("prix limite positif attendu : " + price);
        }
    }
}
