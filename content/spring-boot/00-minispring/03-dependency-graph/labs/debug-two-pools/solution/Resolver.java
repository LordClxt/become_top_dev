import java.util.List;

/** Trouve, pour chaque paramètre de constructeur, le bean qui convient. */
final class Resolver {
    private final MiniContainer container;

    Resolver(MiniContainer container) { this.container = container; }

    Object[] argumentsFor(BeanDefinition def) {
        List<Class<?>> deps = def.dependencies();
        Object[] args = new Object[deps.size()];
        for (int i = 0; i < args.length; i++) {
            // Toujours repasser par le conteneur : c'est lui qui détient le cache des singletons.
            args[i] = container.getBean(container.definitionOfType(deps.get(i)).name());
        }
        return args;
    }
}
