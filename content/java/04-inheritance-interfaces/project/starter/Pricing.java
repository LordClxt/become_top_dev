/** Comment un ordre fixe son prix : au marché, ou avec une limite. */
public interface Pricing {
    record Market() implements Pricing { }

    record Limit(Money price) implements Pricing { }
}
