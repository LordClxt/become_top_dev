import java.beans.Introspector;
import java.lang.reflect.Constructor;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Conteneur fourni (constructeurs sans paramètre) : il crée d'abord les beans qui sont des
 * BeanPostProcessor, puis les autres, et délègue le cycle de vie à Lifecycle. Ne pas modifier.
 */
public class MiniContainer implements AutoCloseable {
    private final Map<String, Class<?>> types = new LinkedHashMap<>();
    private final Map<String, Object> beans = new LinkedHashMap<>();
    private final List<BeanPostProcessor> processors = new ArrayList<>();
    private final List<Object> createdInOrder = new ArrayList<>();

    public MiniContainer register(Class<?>... classes) {
        for (Class<?> c : classes) types.put(Introspector.decapitalize(c.getSimpleName()), c);
        return this;
    }

    public MiniContainer start() {
        try {
            // Les post-processors d'abord : ils doivent exister avant les beans qu'ils traitent.
            types.forEach((name, type) -> {
                if (BeanPostProcessor.class.isAssignableFrom(type)) {
                    Object raw = instantiate(type);
                    createdInOrder.add(raw);
                    beans.put(name, Lifecycle.initialize(name, raw, List.of()));
                    processors.add((BeanPostProcessor) beans.get(name));
                }
            });
            types.forEach((name, type) -> {
                if (!beans.containsKey(name)) {
                    Object raw = instantiate(type);
                    createdInOrder.add(raw);
                    beans.put(name, Lifecycle.initialize(name, raw, processors));
                }
            });
        } catch (RuntimeException e) {
            close();
            throw e;
        }
        return this;
    }

    public Object getBean(String name) {
        Object bean = beans.get(name);
        if (bean == null) throw new BeanException("aucun bean nommé " + name);
        return bean;
    }

    @Override
    public void close() {
        List<Object> toDestroy = List.copyOf(createdInOrder);
        createdInOrder.clear();
        Lifecycle.destroyAll(toDestroy);
    }

    private static Object instantiate(Class<?> type) {
        try {
            Constructor<?> c = type.getDeclaredConstructor();
            c.setAccessible(true);
            return c.newInstance();
        } catch (ReflectiveOperationException e) {
            throw new BeanException("impossible d'instancier " + type.getSimpleName(), e);
        }
    }
}
