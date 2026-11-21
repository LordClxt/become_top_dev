import java.util.List;

/** Lit, par réflexion, ce dont un conteneur a besoin pour fabriquer un objet. */
public final class Inspector {
    private Inspector() { }

    /** Vrai si la classe porte @Component. */
    public static boolean isComponent(Class<?> type) {
        throw new UnsupportedOperationException("isComponent");
    }

    /** La valeur de @Component si elle est renseignée, sinon le nom simple « à la Spring ». */
    public static String beanName(Class<?> type) {
        throw new UnsupportedOperationException("beanName");
    }

    /** Les types des paramètres du constructeur à utiliser : le seul, ou celui annoté @Inject. */
    public static List<Class<?>> dependencies(Class<?> type) {
        throw new UnsupportedOperationException("dependencies");
    }
}
