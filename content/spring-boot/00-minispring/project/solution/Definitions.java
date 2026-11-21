import java.beans.Introspector;
import java.lang.reflect.Constructor;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.List;

/** Lit les annotations d'une classe et en fait une définition. Aucune instance n'est créée ici. */
final class Definitions {
    private Definitions() { }

    static BeanDefinition of(Class<?> type) {
        Component component = type.getAnnotation(Component.class);
        if (component == null) {
            throw new BeanException(type.getSimpleName() + " n'est pas annotée @Component");
        }
        if (type.isInterface() || Modifier.isAbstract(type.getModifiers())) {
            throw new BeanException(type.getSimpleName() + " n'est pas instanciable");
        }
        String name = component.value().isEmpty() ? beanName(type) : component.value();
        return new BeanDefinition(name, type, type.isAnnotationPresent(Prototype.class), constructorOf(type));
    }

    /** Comme Spring : PriceCalculator → priceCalculator, mais URLParser reste URLParser. */
    static String beanName(Class<?> type) {
        return Introspector.decapitalize(type.getSimpleName());
    }

    /** Le seul constructeur, ou celui annoté @Inject. */
    static Constructor<?> constructorOf(Class<?> type) {
        Constructor<?>[] all = type.getDeclaredConstructors();
        Constructor<?> chosen;
        if (all.length == 1) {
            chosen = all[0];
        } else {
            List<Constructor<?>> marked = Arrays.stream(all).filter(c -> c.isAnnotationPresent(Inject.class)).toList();
            if (marked.size() != 1) {
                throw new BeanException(type.getSimpleName() + " a " + all.length
                        + " constructeurs : annote celui à utiliser avec @Inject");
            }
            chosen = marked.getFirst();
        }
        chosen.setAccessible(true);
        return chosen;
    }
}
