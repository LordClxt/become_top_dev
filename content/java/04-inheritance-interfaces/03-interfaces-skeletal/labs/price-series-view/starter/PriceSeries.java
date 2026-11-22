import java.util.Arrays;
import java.util.List;

/** Une série de prix en centimes, de taille fixe (les cotations d'une journée, par exemple). */
public final class PriceSeries {
    private final long[] cents;

    private PriceSeries(long[] cents) {
        this.cents = cents;
    }

    public static PriceSeries of(long... cents) {
        return new PriceSeries(cents.clone());
    }

    public long max() {
        return Arrays.stream(cents).max().orElseThrow();
    }

    /** La série vue comme une liste : les modifications de la liste sont celles de la série. */
    public List<Long> asList() {
        return Arrays.stream(cents).boxed().toList();
    }
}
