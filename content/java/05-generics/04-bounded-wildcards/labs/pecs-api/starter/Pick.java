import java.util.HashSet;
import java.util.List;
import java.util.Set;

/** Outils de sélection. */
public final class Pick {
    private Pick() { }

    /** Le plus grand élément d'une liste non vide, selon l'ordre naturel. */
    public static <E extends Comparable<E>> E max(List<E> list) {
        if (list.isEmpty()) throw new IllegalArgumentException("liste vide");
        E best = list.get(0);
        for (E e : list) if (e.compareTo(best) > 0) best = e;
        return best;
    }

    /** Tous les éléments des deux ensembles. */
    public static <E> Set<E> union(Set<E> s1, Set<E> s2) {
        Set<E> result = new HashSet<>(s1);
        result.addAll(s2);
        return result;
    }
}
