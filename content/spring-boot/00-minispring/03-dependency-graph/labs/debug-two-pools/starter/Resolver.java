import java.util.List;

/** Trouve, pour chaque paramètre de constructeur, le bean qui convient. */
final class Resolver {
    private final MiniContainer container;
    private Factory factory;

    Resolver(MiniContainer container) { this.container = container; }

    void setFactory(Factory factory) { this.factory = factory; }

    Object[] argumentsFor(BeanDefinition def) {
        List<Class<?>> deps = def.dependencies();
        Object[] args = new Object[deps.size()];
        for (int i = 0; i < args.length; i++) {
            BeanDefinition dep = container.definitionOfType(deps.get(i));
            // Optimisation : on a déjà la définition, inutile de repasser par le conteneur.
            args[i] = factory.create(dep);
        }
        return args;
    }
}
