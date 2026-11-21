import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Crée les singletons dans l'ordre de leurs dépendances et refuse les cycles. */
public class Graph {
    private final Map<String, Recipe> recipes = new LinkedHashMap<>();
    private final Map<String, Object> singletons = new LinkedHashMap<>();
    /** Beans en cours de création, dans l'ordre : c'est le chemin parcouru (DefaultSingletonBeanRegistry fait pareil). */
    private final Set<String> inCreation = new LinkedHashSet<>();
    private final List<String> order = new ArrayList<>();

    public Graph add(Recipe recipe) {
        if (recipes.putIfAbsent(recipe.name(), recipe) != null) {
            throw new BeanException("bean déjà défini : " + recipe.name());
        }
        return this;
    }

    public Object getBean(String name) {
        return obtain(name, null);
    }

    public Graph start() {
        for (String name : recipes.keySet()) obtain(name, null);
        return this;
    }

    public List<String> creationOrder() {
        return List.copyOf(order);
    }

    private Object obtain(String name, String requester) {
        Object existing = singletons.get(name);
        if (existing != null) return existing;
        Recipe recipe = recipes.get(name);
        if (recipe == null) {
            throw new BeanException("aucun bean nommé " + name + (requester == null ? "" : " (demandé par " + requester + ")"));
        }
        if (!inCreation.add(name)) {
            List<String> path = new ArrayList<>(inCreation);
            path = path.subList(path.indexOf(name), path.size());
            throw new BeanException("cycle de dépendances : " + String.join(" → ", path) + " → " + name);
        }
        try {
            List<Object> deps = new ArrayList<>();
            for (String dep : recipe.dependsOn()) deps.add(obtain(dep, name));   // les dépendances d'abord
            Object bean = recipe.factory().apply(deps);
            singletons.put(name, bean);
            order.add(name);
            return bean;
        } finally {
            inCreation.remove(name);   // même en cas d'erreur : sinon un 2e essai verrait un faux cycle
        }
    }
}
