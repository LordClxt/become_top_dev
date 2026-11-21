import java.util.List;

/** Crée les singletons dans l'ordre de leurs dépendances et refuse les cycles. */
public class Graph {

    public Graph add(Recipe recipe) {
        throw new UnsupportedOperationException("add");
    }

    /** Le singleton nommé, créé (avec ses dépendances) à la première demande. */
    public Object getBean(String name) {
        throw new UnsupportedOperationException("getBean");
    }

    /** Crée tous les singletons, dans l'ordre d'ajout des recettes. */
    public Graph start() {
        throw new UnsupportedOperationException("start");
    }

    /** Les noms des beans, dans l'ordre où leurs objets ont été créés. */
    public List<String> creationOrder() {
        throw new UnsupportedOperationException("creationOrder");
    }
}
