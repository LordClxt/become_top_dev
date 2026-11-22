import java.util.AbstractList;
import java.util.Arrays;
import java.util.List;
import java.util.RandomAccess;

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

    /**
     * La série vue comme une liste, sans copie : les modifications de la liste sont celles de la série.
     * Taille fixe : add et remove lèvent UnsupportedOperationException (comportement d'AbstractList).
     */
    public List<Long> asList() {
        return new View(cents);
    }

    /** Implémentation squelette : trois primitives, AbstractList fournit le reste (contains, indexOf, equals, subList…). */
    private static final class View extends AbstractList<Long> implements RandomAccess {
        private final long[] a;

        View(long[] a) {
            this.a = a;
        }

        @Override
        public Long get(int index) {
            return a[index];
        }

        @Override
        public Long set(int index, Long value) {
            long old = a[index];
            a[index] = value;   // déballage : null lève NullPointerException avant toute modification
            return old;
        }

        @Override
        public int size() {
            return a.length;
        }
    }
}
