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
    public static Set union(Set s1, Set s2) {
        Set result = new HashSet(s1);
        result.addAll(s2);
        return result;
    }

    /** Le plus grand élément, selon l'ordre naturel ; vide si la collection l'est. */
    public static Optional max(Collection c) {
        Comparable best = null;
        for (Object o : c) {
            Comparable e = (Comparable) o;
            if (best == null || e.compareTo(best) > 0) best = e;
        }
        return Optional.ofNullable(best);
    }

    /** Une fonction qui renvoie son argument. */
    public static UnaryOperator identity() {
        return new UnaryOperator() {
            @Override
            public Object apply(Object t) {
                return t;
            }
        };
    }

    /** La table inversée (valeur → clé) ; IllegalArgumentException si deux clés ont la même valeur. */
    public static Map invert(Map m) {
        Map out = new HashMap();
        for (Object o : m.entrySet()) {
            Map.Entry e = (Map.Entry) o;
            out.put(e.getValue(), e.getKey());
        }
        return out;
    }
}
