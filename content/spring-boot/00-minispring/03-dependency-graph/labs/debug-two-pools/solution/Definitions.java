import java.beans.Introspector;
import java.lang.reflect.Constructor;

/** Lit une classe @Component (un seul constructeur). */
final class Definitions {
    private Definitions() { }

    static BeanDefinition of(Class<?> type) {
        if (!type.isAnnotationPresent(Component.class)) throw new BeanException(type.getSimpleName() + " n'est pas un composant");
        Constructor<?> ctor = type.getDeclaredConstructors()[0];
        ctor.setAccessible(true);
        return new BeanDefinition(Introspector.decapitalize(type.getSimpleName()), type, ctor);
    }
}
