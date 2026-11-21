import java.util.List;

/** Un registre de définitions et un cache de singletons (classes à constructeur sans paramètre). */
public class Registry {

    public Registry register(Class<?>... types) {
        throw new UnsupportedOperationException("register");
    }

    public List<BeanDefinition> definitions() {
        throw new UnsupportedOperationException("definitions");
    }

    public Object getBean(String name) {
        throw new UnsupportedOperationException("getBean(String)");
    }

    public <T> T getBean(Class<T> type) {
        throw new UnsupportedOperationException("getBean(Class)");
    }

    /** Nombre d'objets créés depuis le début (singletons et prototypes). */
    public int instancesCreated() {
        throw new UnsupportedOperationException("instancesCreated");
    }
}
