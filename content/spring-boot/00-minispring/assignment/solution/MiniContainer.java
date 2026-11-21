import java.beans.Introspector;
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Type;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Minispring, avec la résolution des paramètres déléguée à Resolution. Fourni : ne pas modifier. */
public class MiniContainer implements BeanLookup {
    private final Map<String, BeanDefinition> definitions = new LinkedHashMap<>();
    private final Map<String, Object> singletons = new LinkedHashMap<>();

    public MiniContainer register(Class<?>... types) {
        for (Class<?> t : types) {
            Constructor<?> ctor = t.getDeclaredConstructors()[0];
            ctor.setAccessible(true);
            String name = Introspector.decapitalize(t.getSimpleName());
            definitions.put(name, new BeanDefinition(name, t, t.isAnnotationPresent(Prototype.class),
                    t.isAnnotationPresent(Primary.class), ctor));
        }
        return this;
    }

    public MiniContainer start() {
        for (BeanDefinition d : definitions.values()) if (!d.prototype()) obtain(d);
        return this;
    }

    public Object getBean(String name) {
        return obtain(definitions.get(name));
    }

    @Override
    public List<BeanDefinition> candidates(Class<?> type) {
        return definitions.values().stream().filter(d -> type.isAssignableFrom(d.type())).toList();
    }

    @Override
    public Object obtain(BeanDefinition def) {
        if (def.prototype()) return create(def);
        Object existing = singletons.get(def.name());
        if (existing != null) return existing;
        Object bean = create(def);
        singletons.put(def.name(), bean);
        return bean;
    }

    private Object create(BeanDefinition def) {
        // getGenericParameterTypes : List<Gateway> et Provider<Cart>, avec leur argument de type.
        Type[] params = def.constructor().getGenericParameterTypes();
        Object[] args = new Object[params.length];
        for (int i = 0; i < params.length; i++) args[i] = Resolution.argument(params[i], this, def.name());
        try {
            return def.constructor().newInstance(args);
        } catch (InvocationTargetException e) {
            throw new BeanException("échec de création de " + def.name() + " : " + e.getCause().getMessage(), e.getCause());
        } catch (ReflectiveOperationException e) {
            throw new BeanException("impossible d'instancier " + def.name(), e);
        }
    }
}
