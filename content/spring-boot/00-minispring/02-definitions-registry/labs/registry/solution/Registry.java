import java.beans.Introspector;
import java.lang.reflect.Constructor;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Un registre de définitions et un cache de singletons (classes à constructeur sans paramètre). */
public class Registry {
    private final Map<String, BeanDefinition> definitions = new LinkedHashMap<>();
    private final Map<String, Object> singletons = new LinkedHashMap<>();
    private int created;

    // Temps 1 : on lit des annotations, on ne crée rien.
    public Registry register(Class<?>... types) {
        for (Class<?> type : types) {
            Component c = type.getAnnotation(Component.class);
            if (c == null) throw new BeanException(type.getSimpleName() + " n'est pas annotée @Component");
            String name = c.value().isEmpty() ? Introspector.decapitalize(type.getSimpleName()) : c.value();
            BeanDefinition def = new BeanDefinition(name, type, type.isAnnotationPresent(Prototype.class));
            if (definitions.putIfAbsent(name, def) != null) throw new BeanException("bean déjà défini : " + name);
        }
        return this;
    }

    public List<BeanDefinition> definitions() {
        return List.copyOf(definitions.values());
    }

    public Object getBean(String name) {
        BeanDefinition def = definitions.get(name);
        if (def == null) throw new BeanException("aucun bean nommé " + name);
        return obtain(def);
    }

    public <T> T getBean(Class<T> type) {
        List<BeanDefinition> candidates = definitions.values().stream()
                .filter(d -> type.isAssignableFrom(d.type())).toList();
        if (candidates.isEmpty()) throw new BeanException("aucun bean de type " + type.getSimpleName());
        if (candidates.size() > 1) {
            throw new BeanException(candidates.size() + " beans de type " + type.getSimpleName() + " : "
                    + candidates.stream().map(BeanDefinition::name).collect(Collectors.joining(", ")));
        }
        return type.cast(obtain(candidates.getFirst()));
    }

    public int instancesCreated() {
        return created;
    }

    // Le cache est indexé par NOM : c'est le nom qui identifie un bean, pas sa classe.
    private Object obtain(BeanDefinition def) {
        if (def.prototype()) return instantiate(def);
        return singletons.computeIfAbsent(def.name(), n -> instantiate(def));
    }

    private Object instantiate(BeanDefinition def) {
        try {
            Constructor<?> ctor = def.type().getDeclaredConstructor();
            ctor.setAccessible(true);
            Object bean = ctor.newInstance();
            created++;
            return bean;
        } catch (ReflectiveOperationException e) {
            throw new BeanException("impossible d'instancier " + def.name(), e);
        }
    }
}
