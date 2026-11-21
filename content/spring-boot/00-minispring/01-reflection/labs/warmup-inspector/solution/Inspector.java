import java.beans.Introspector;
import java.lang.reflect.Constructor;
import java.util.Arrays;
import java.util.List;

/** Lit, par réflexion, ce dont un conteneur a besoin pour fabriquer un objet. */
public final class Inspector {
    private Inspector() { }

    /** Vrai si la classe porte @Component (visible à l'exécution grâce à @Retention(RUNTIME)). */
    public static boolean isComponent(Class<?> type) {
        return type.isAnnotationPresent(Component.class);
    }

    /** La valeur de @Component si elle est renseignée, sinon le nom simple « à la Spring ». */
    public static String beanName(Class<?> type) {
        Component c = type.getAnnotation(Component.class);
        if (c != null && !c.value().isEmpty()) return c.value();
        // decapitalize : minuscule en tête, sauf si les deux premières lettres sont majuscules (URLParser).
        return Introspector.decapitalize(type.getSimpleName());
    }

    /** Les types des paramètres du constructeur à utiliser : le seul, ou celui annoté @Inject. */
    public static List<Class<?>> dependencies(Class<?> type) {
        Constructor<?>[] all = type.getDeclaredConstructors();
        if (all.length == 1) return List.of(all[0].getParameterTypes());
        List<Constructor<?>> marked = Arrays.stream(all).filter(c -> c.isAnnotationPresent(Inject.class)).toList();
        if (marked.size() != 1) {
            throw new IllegalStateException(type.getSimpleName() + " : " + all.length
                    + " constructeurs et " + marked.size() + " annoté(s) @Inject");
        }
        return List.of(marked.getFirst().getParameterTypes());
    }
}
