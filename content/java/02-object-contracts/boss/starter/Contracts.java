import java.util.Comparator;
import java.util.List;

/** Vérifie les contrats d'equals, de hashCode et de compareTo sur des échantillons. */
public final class Contracts {
    private Contracts() { throw new AssertionError(); }

    public static Report checkEquals(List<?> samples) {
        throw new UnsupportedOperationException("checkEquals à écrire");
    }

    public static <T> Report checkComparator(List<? extends T> samples, Comparator<? super T> comparator) {
        throw new UnsupportedOperationException("checkComparator à écrire");
    }

    public static <T extends Comparable<? super T>> Report checkComparable(List<T> samples) {
        throw new UnsupportedOperationException("checkComparable à écrire");
    }
}
