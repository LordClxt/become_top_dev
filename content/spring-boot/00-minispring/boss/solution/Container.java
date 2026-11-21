import java.beans.Introspector;
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Un conteneur dont refresh() suit les deux temps de Spring. */
public class Container implements AutoCloseable {
    private final Map<String, BeanDefinition> definitions = new LinkedHashMap<>();
    private final Map<String, Object> singletons = new LinkedHashMap<>();
    private final List<BeanPostProcessor> processors = new ArrayList<>();
    private final Deque<Object> created = new ArrayDeque<>();
    private final List<String> warnings = new ArrayList<>();
    /** Nombre de BeanPostProcessor qu'aura l'application ; un bean créé avant qu'ils existent tous est signalé. */
    private int expectedProcessors;

    public Container register(Class<?>... types) {
        for (Class<?> t : types) {
            if (!t.isAnnotationPresent(Component.class)) throw new BeanException(t.getSimpleName() + " n'est pas un composant");
            String name = Introspector.decapitalize(t.getSimpleName());
            definitions.put(name, new BeanDefinition(name, t, t.isAnnotationPresent(Prototype.class)));
        }
        return this;
    }

    public Container refresh() {
        try {
            // Temps 1 : les recettes. Les DefinitionProcessor sont créés sans dépendance, puis appliqués.
            for (BeanDefinition def : List.copyOf(definitions.values())) {
                if (!DefinitionProcessor.class.isAssignableFrom(def.type())) continue;
                Constructor<?> ctor = constructorOf(def);
                if (ctor.getParameterCount() > 0) {
                    throw new BeanException("un DefinitionProcessor ne reçoit pas de dépendances : " + def.name());
                }
                DefinitionProcessor p = (DefinitionProcessor) register(def, instantiate(def, new Object[0]));
                p.process(new Registry());
            }
            // Temps 2a : les BeanPostProcessor, avant tout autre bean.
            List<BeanDefinition> bpps = definitions.values().stream()
                    .filter(d -> BeanPostProcessor.class.isAssignableFrom(d.type())).toList();
            expectedProcessors = bpps.size();
            for (BeanDefinition def : bpps) {
                BeanPostProcessor p = (BeanPostProcessor) obtain(def.name());
                if (!processors.contains(p)) processors.add(p);
            }
            // Temps 2b : tous les autres singletons.
            for (BeanDefinition def : List.copyOf(definitions.values())) if (!def.prototype()) obtain(def.name());
        } catch (RuntimeException e) {
            close();
            throw e;
        }
        return this;
    }

    public Object getBean(String name) {
        return obtain(name);
    }

    public List<String> warnings() {
        return List.copyOf(warnings);
    }

    @Override
    public void close() {
        BeanException first = null;
        while (!created.isEmpty()) {
            Object bean = created.pop();
            for (Method m : bean.getClass().getDeclaredMethods()) {
                if (!m.isAnnotationPresent(PreDestroy.class)) continue;
                try {
                    m.setAccessible(true);
                    m.invoke(bean);
                } catch (ReflectiveOperationException e) {
                    BeanException be = new BeanException("échec de @PreDestroy : " + m, e);
                    if (first == null) first = be; else first.addSuppressed(be);
                }
            }
        }
        singletons.clear();
        if (first != null) throw first;
    }

    private Object obtain(String name) {
        BeanDefinition def = definitions.get(name);
        if (def == null) throw new BeanException("aucun bean nommé " + name);
        if (!def.prototype() && singletons.containsKey(name)) return singletons.get(name);
        Constructor<?> ctor = constructorOf(def);
        Object[] args = new Object[ctor.getParameterCount()];
        for (int i = 0; i < args.length; i++) args[i] = obtain(nameOfType(ctor.getParameterTypes()[i], name));
        Object raw = instantiate(def, args);
        Object bean = raw;
        boolean isProcessor = raw instanceof BeanPostProcessor;
        if (!isProcessor) {
            for (BeanPostProcessor p : processors) bean = p.after(name, bean);
            if (processors.size() < expectedProcessors) {
                warnings.add("bean '" + name + "' créé trop tôt : non traité par tous les post-processors");
            }
        }
        if (def.prototype()) return bean;
        created.push(raw);
        singletons.put(name, bean);
        return bean;
    }

    private Object register(BeanDefinition def, Object bean) {
        created.push(bean);
        singletons.put(def.name(), bean);
        return bean;
    }

    private String nameOfType(Class<?> type, String requester) {
        List<String> names = definitions.values().stream().filter(d -> type.isAssignableFrom(d.type()))
                .map(BeanDefinition::name).toList();
        if (names.size() != 1) {
            throw new BeanException(names.size() + " beans de type " + type.getSimpleName() + " (demandé par " + requester + ")");
        }
        return names.getFirst();
    }

    private static Constructor<?> constructorOf(BeanDefinition def) {
        Constructor<?> c = def.type().getDeclaredConstructors()[0];
        c.setAccessible(true);
        return c;
    }

    private static Object instantiate(BeanDefinition def, Object[] args) {
        try {
            return constructorOf(def).newInstance(args);
        } catch (InvocationTargetException e) {
            throw new BeanException("échec de création de " + def.name() + " : " + e.getCause().getMessage(), e.getCause());
        } catch (ReflectiveOperationException e) {
            throw new BeanException("impossible d'instancier " + def.name(), e);
        }
    }

    /** La vue modifiable des définitions offerte aux DefinitionProcessor. */
    private final class Registry implements DefinitionRegistry {
        public List<String> names() { return List.copyOf(definitions.keySet()); }
        public BeanDefinition get(String name) { return definitions.get(name); }
        public void replace(BeanDefinition d) {
            if (!definitions.containsKey(d.name())) throw new BeanException("aucun bean nommé " + d.name());
            definitions.put(d.name(), d);
        }
        public void remove(String name) { definitions.remove(name); }
    }
}
