import java.lang.reflect.InvocationTargetException;

/** Fabrique un objet à partir de sa définition et de ses dépendances résolues. */
final class Factory {
    private final Resolver resolver;

    Factory(Resolver resolver) { this.resolver = resolver; }

    Object create(BeanDefinition def) {
        Object[] args = resolver.argumentsFor(def);
        try {
            return def.constructor().newInstance(args);
        } catch (InvocationTargetException e) {
            throw new BeanException("échec de création de " + def.name() + " : " + e.getCause().getMessage(), e.getCause());
        } catch (ReflectiveOperationException e) {
            throw new BeanException("impossible d'instancier " + def.name(), e);
        }
    }
}
