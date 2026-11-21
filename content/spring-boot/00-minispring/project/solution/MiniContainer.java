import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Un conteneur d'injection de dépendances minimal, construit comme celui de Spring. */
public class MiniContainer implements AutoCloseable {
    private final Map<String, BeanDefinition> definitions = new LinkedHashMap<>();
    private final Map<String, Object> singletons = new LinkedHashMap<>();
    /** Les beans en cours de création, dans l'ordre : sert à détecter (et décrire) un cycle. */
    private final Set<String> inCreation = new LinkedHashSet<>();
    /** Les singletons dans leur ordre de création : la fermeture se fait dans l'ordre inverse. */
    private final Deque<Object> created = new ArrayDeque<>();
    private boolean started;

    // ---------- M1 : définitions et portées ----------

    public MiniContainer register(Class<?>... types) {
        if (started) throw new BeanException("le conteneur est démarré : plus d'enregistrement possible");
        for (Class<?> type : types) {
            BeanDefinition def = Definitions.of(type);
            if (definitions.putIfAbsent(def.name(), def) != null) {
                throw new BeanException("bean déjà défini : " + def.name());
            }
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
        return type.cast(obtain(uniqueOfType(type, null)));
    }

    // ---------- M2 : injection par constructeur, démarrage, cycles ----------

    /** Crée tous les singletons. Si l'un échoue, détruit ceux déjà créés puis propage l'erreur. */
    public MiniContainer start() {
        try {
            for (BeanDefinition def : definitions.values()) {
                if (!def.prototype()) obtain(def);
            }
        } catch (RuntimeException e) {
            close();
            throw e;
        }
        started = true;
        return this;
    }

    private Object obtain(BeanDefinition def) {
        if (def.prototype()) return create(def);
        Object existing = singletons.get(def.name());
        if (existing != null) return existing;
        Object bean = create(def);
        singletons.put(def.name(), bean);
        created.push(bean);
        return bean;
    }

    private Object create(BeanDefinition def) {
        if (!inCreation.add(def.name())) {
            List<String> path = new ArrayList<>(inCreation);
            path = path.subList(path.indexOf(def.name()), path.size());
            throw new BeanException("cycle de dépendances : " + String.join(" → ", path) + " → " + def.name());
        }
        try {
            List<Class<?>> deps = def.dependencies();
            Object[] args = new Object[deps.size()];
            for (int i = 0; i < args.length; i++) {
                args[i] = obtain(uniqueOfType(deps.get(i), def));
            }
            Object bean = instantiate(def, args);
            invokeAnnotated(bean, PostConstruct.class, def);
            return bean;
        } finally {
            inCreation.remove(def.name());
        }
    }

    private BeanDefinition uniqueOfType(Class<?> type, BeanDefinition requester) {
        List<BeanDefinition> candidates = definitions.values().stream()
                .filter(d -> type.isAssignableFrom(d.type()))
                .toList();
        String forWhom = requester == null ? "" : " (demandé par " + requester.name() + ")";
        if (candidates.isEmpty()) {
            throw new BeanException("aucun bean de type " + type.getSimpleName() + forWhom);
        }
        if (candidates.size() > 1) {
            throw new BeanException(candidates.size() + " beans de type " + type.getSimpleName() + forWhom + " : "
                    + candidates.stream().map(BeanDefinition::name).collect(Collectors.joining(", ")));
        }
        return candidates.getFirst();
    }

    private static Object instantiate(BeanDefinition def, Object[] args) {
        try {
            return def.constructor().newInstance(args);
        } catch (InvocationTargetException e) {
            throw new BeanException("échec de création de " + def.name() + " : " + e.getCause().getMessage(), e.getCause());
        } catch (ReflectiveOperationException e) {
            throw new BeanException("impossible d'instancier " + def.name(), e);
        }
    }

    // ---------- M3 : cycle de vie ----------

    private static void invokeAnnotated(Object bean, Class<? extends java.lang.annotation.Annotation> marker,
            BeanDefinition def) {
        for (Method m : bean.getClass().getDeclaredMethods()) {
            if (!m.isAnnotationPresent(marker)) continue;
            if (m.getParameterCount() != 0) {
                throw new BeanException(def.name() + "." + m.getName() + " : @" + marker.getSimpleName()
                        + " exige une méthode sans paramètre");
            }
            try {
                m.setAccessible(true);
                m.invoke(bean);
            } catch (InvocationTargetException e) {
                throw new BeanException("échec de @" + marker.getSimpleName() + " sur " + def.name() + " : "
                        + e.getCause().getMessage(), e.getCause());
            } catch (IllegalAccessException e) {
                throw new BeanException("méthode inaccessible : " + m, e);
            }
        }
    }

    /** Appelle les @PreDestroy des singletons, du dernier créé au premier ; une erreur n'arrête pas les autres. */
    @Override
    public void close() {
        BeanException first = null;
        while (!created.isEmpty()) {
            Object bean = created.pop();
            String name = nameOf(bean);
            try {
                invokeAnnotated(bean, PreDestroy.class, definitions.get(name));
            } catch (BeanException e) {
                if (first == null) first = e; else first.addSuppressed(e);
            }
        }
        singletons.clear();
        started = false;
        if (first != null) throw first;
    }

    private String nameOf(Object bean) {
        return singletons.entrySet().stream().filter(e -> e.getValue() == bean)
                .map(Map.Entry::getKey).findFirst().orElseThrow();
    }
}
