import java.util.List;

/** Le cycle de vie d'un bean : initialisation encadrée par les post-processors, puis destruction. */
final class Lifecycle {
    private Lifecycle() { }

    /** before de chaque processeur, puis les @PostConstruct, puis after de chaque processeur. Renvoie le bean final. */
    static Object initialize(String name, Object bean, List<BeanPostProcessor> processors) {
        throw new UnsupportedOperationException("initialize");
    }

    /** Les @PreDestroy, du dernier objet créé au premier ; une erreur n'empêche pas les suivantes. */
    static void destroyAll(List<Object> createdInOrder) {
        throw new UnsupportedOperationException("destroyAll");
    }
}
