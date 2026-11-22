import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Outils de sélection. PECS : les listes et ensembles reçus produisent, Comparable consomme. */
public final class Pick {
    private Pick() { }

    /** Le plus grand élément d'une liste non vide, selon l'ordre naturel. */
    public static <T extends Comparable<? super T>> T max(List<? extends T> list) {
        if (list.isEmpty()) throw new IllegalArgumentException("liste vide");
        T best = list.get(0);
        for (T t : list) if (t.compareTo(best) > 0) best = t;
        return best;
    }

    /** Tous les éléments des deux ensembles. */
    public static <E> Set<E> union(Set<? extends E> s1, Set<? extends E> s2) {
        Set<E> result = new HashSet<>(s1);
        result.addAll(s2);
        return result;
    }
}
