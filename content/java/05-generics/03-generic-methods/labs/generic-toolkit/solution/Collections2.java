import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.UnaryOperator;

/** Petits outils sur les collections, partagés par tout Ordo. */
public final class Collections2 {
    private Collections2() { }

    /** Tous les éléments des deux ensembles. */
    public static <E> Set<E> union(Set<E> s1, Set<E> s2) {
        Set<E> result = new HashSet<>(s1);
        result.addAll(s2);
        return result;
    }

    /** Le plus grand élément, selon l'ordre naturel ; vide si la collection l'est. */
    public static <E extends Comparable<E>> Optional<E> max(Collection<E> c) {
        E best = null;
        for (E e : c) {
            if (best == null || e.compareTo(best) > 0) best = e;
        }
        return Optional.ofNullable(best);
    }

    private static final UnaryOperator<Object> IDENTITY = t -> t;

    /** Une fonction qui renvoie son argument : un seul objet, servi sous tous les types. */
    public static <T> UnaryOperator<T> identity() {
        // Sûr : la fonction renvoie son argument tel quel, donc un T reste un T.
        @SuppressWarnings("unchecked") UnaryOperator<T> f = (UnaryOperator<T>) IDENTITY;
        return f;
    }

    /** La table inversée (valeur → clé) ; IllegalArgumentException si deux clés ont la même valeur. */
    public static <K, V> Map<V, K> invert(Map<K, V> m) {
        Map<V, K> out = new HashMap<>();
        for (Map.Entry<K, V> e : m.entrySet()) {
            K previous = out.putIfAbsent(e.getValue(), e.getKey());
            if (previous != null) {
                throw new IllegalArgumentException("valeur en double : " + e.getValue() + " (clés " + previous + " et " + e.getKey() + ")");
            }
        }
        return out;
    }
}
