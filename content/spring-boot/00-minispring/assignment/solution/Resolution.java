import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.List;
import java.util.stream.Collectors;

/** Trouve la valeur d'un paramètre de constructeur. */
final class Resolution {
    private Resolution() { }

    static Object argument(Type type, BeanLookup beans, String requester) {
        if (type instanceof ParameterizedType p && p.getRawType() == List.class) {
            Class<?> element = elementClass(p, requester);
            // Tous les candidats, dans l'ordre d'enregistrement ; aucun = liste vide, pas une erreur.
            return beans.candidates(element).stream().map(beans::obtain).toList();
        }
        if (type instanceof ParameterizedType p && p.getRawType() == Provider.class) {
            Class<?> element = elementClass(p, requester);
            // Rien n'est résolu maintenant : chaque get() refait la recherche (et crée un nouveau prototype).
            return (Provider<Object>) () -> beans.obtain(single(element, beans, requester));
        }
        if (type instanceof Class<?> c) {
            return beans.obtain(single(c, beans, requester));
        }
        throw new BeanException("type de paramètre non pris en charge dans " + requester + " : " + type.getTypeName());
    }

    /** Exactement un candidat, sinon l'unique @Primary, sinon une erreur qui liste les candidats. */
    private static BeanDefinition single(Class<?> type, BeanLookup beans, String requester) {
        List<BeanDefinition> candidates = beans.candidates(type);
        if (candidates.size() == 1) return candidates.getFirst();
        if (candidates.isEmpty()) {
            throw new BeanException("aucun bean de type " + type.getSimpleName() + " (demandé par " + requester + ")");
        }
        List<BeanDefinition> primaries = candidates.stream().filter(BeanDefinition::primary).toList();
        if (primaries.size() == 1) return primaries.getFirst();
        String names = (primaries.isEmpty() ? candidates : primaries).stream()
                .map(BeanDefinition::name).collect(Collectors.joining(", "));
        if (primaries.size() > 1) {
            throw new BeanException("plusieurs beans @Primary de type " + type.getSimpleName() + " (demandé par "
                    + requester + ") : " + names);
        }
        throw new BeanException(candidates.size() + " beans de type " + type.getSimpleName() + " (demandé par "
                + requester + ") : " + names);
    }

    private static Class<?> elementClass(ParameterizedType p, String requester) {
        if (p.getActualTypeArguments()[0] instanceof Class<?> c) return c;
        throw new BeanException("type générique non pris en charge dans " + requester + " : " + p.getTypeName());
    }
}
