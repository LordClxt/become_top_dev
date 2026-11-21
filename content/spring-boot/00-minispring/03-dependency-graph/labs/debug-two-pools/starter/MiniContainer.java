import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Le conteneur : définitions, cache des singletons, démarrage. */
public class MiniContainer {
    private final Map<String, BeanDefinition> definitions = new LinkedHashMap<>();
    private final Map<String, Object> singletons = new LinkedHashMap<>();
    private final Factory factory;

    public MiniContainer() {
        Resolver resolver = new Resolver(this);
        factory = new Factory(resolver);
        resolver.setFactory(factory);
    }

    public MiniContainer register(Class<?>... types) {
        for (Class<?> t : types) {
            BeanDefinition def = Definitions.of(t);
            definitions.put(def.name(), def);
        }
        return this;
    }

    public MiniContainer start() {
        for (BeanDefinition def : definitions.values()) getBean(def.name());
        return this;
    }

    public Object getBean(String name) {
        BeanDefinition def = definitions.get(name);
        if (def == null) throw new BeanException("aucun bean nommé " + name);
        return singletons.computeIfAbsent(name, n -> factory.create(def));
    }

    public <T> T getBean(Class<T> type) {
        BeanDefinition def = definitionOfType(type);
        // Le cache est consulté par le nom de la classe : plus rapide qu'une recherche.
        Object cached = singletons.get(type.getName());
        if (cached != null) return type.cast(cached);
        Object bean = factory.create(def);
        singletons.put(def.name(), bean);
        return type.cast(bean);
    }

    BeanDefinition definitionOfType(Class<?> type) {
        List<BeanDefinition> candidates = definitions.values().stream().filter(d -> type.isAssignableFrom(d.type())).toList();
        if (candidates.size() != 1) {
            throw new BeanException(candidates.size() + " beans de type " + type.getSimpleName());
        }
        return candidates.getFirst();
    }
}
