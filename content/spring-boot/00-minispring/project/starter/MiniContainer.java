import java.util.List;

/** Un conteneur d'injection de dépendances minimal, construit comme celui de Spring. */
public class MiniContainer implements AutoCloseable {

    // ---------- M1 : définitions et portées ----------

    /** Enregistre des classes @Component : lit leurs définitions, ne crée aucun objet. */
    public MiniContainer register(Class<?>... types) {
        throw new UnsupportedOperationException("register (M1)");
    }

    /** Les définitions, dans l'ordre d'enregistrement. */
    public List<BeanDefinition> definitions() {
        throw new UnsupportedOperationException("definitions (M1)");
    }

    public Object getBean(String name) {
        throw new UnsupportedOperationException("getBean(String) (M1)");
    }

    public <T> T getBean(Class<T> type) {
        throw new UnsupportedOperationException("getBean(Class) (M1)");
    }

    // ---------- M2 : injection par constructeur, démarrage, cycles ----------

    /** Crée tous les singletons. Si l'un échoue, détruit ceux déjà créés puis propage l'erreur (M3). */
    public MiniContainer start() {
        throw new UnsupportedOperationException("start (M2)");
    }

    // ---------- M3 : cycle de vie ----------

    /** Appelle les @PreDestroy des singletons, du dernier créé au premier. */
    @Override
    public void close() {
        throw new UnsupportedOperationException("close (M3)");
    }
}
