import java.lang.reflect.Constructor;

/** Lit les annotations d'une classe et en fait une définition. Aucune instance n'est créée ici. */
final class Definitions {
    private Definitions() { }

    /** M1 — la définition d'une classe @Component (nom, portée, constructeur à appeler). */
    static BeanDefinition of(Class<?> type) {
        throw new UnsupportedOperationException("Definitions.of (M1)");
    }

    /** M1 — nom par défaut, comme Spring : PriceCalculator → priceCalculator, URLParser reste URLParser. */
    static String beanName(Class<?> type) {
        throw new UnsupportedOperationException("Definitions.beanName (M1)");
    }

    /** M2 — le seul constructeur, ou celui annoté @Inject. */
    static Constructor<?> constructorOf(Class<?> type) {
        throw new UnsupportedOperationException("Definitions.constructorOf (M2)");
    }
}
