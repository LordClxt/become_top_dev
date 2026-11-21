import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Le conteneur : définitions, cache des singletons, démarrage. */
public class MiniContainer {
    private final Map<String, BeanDefinition> definitions = new LinkedHashMap<>();
    // Une seule clé pour un bean : son NOM. Tous les chemins (nom, type, dépendance) y mènent.
    private final Map<String, Object> singletons = new HashMap<>();
    private final Factory factory = new Factory(new Resolver(this));

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
        Object existing = singletons.get(name);
        if (existing != null) return existing;
        // Pas de computeIfAbsent : la création appelle getBean pour les dépendances, donc modifie la map.
        Object bean = factory.create(def);
        singletons.put(name, bean);
        return bean;
    }

    public <T> T getBean(Class<T> type) {
        return type.cast(getBean(definitionOfType(type).name()));
    }

    BeanDefinition definitionOfType(Class<?> type) {
        List<BeanDefinition> candidates = definitions.values().stream().filter(d -> type.isAssignableFrom(d.type())).toList();
        if (candidates.size() != 1) {
            throw new BeanException(candidates.size() + " beans de type " + type.getSimpleName());
        }
        return candidates.getFirst();
    }
}
