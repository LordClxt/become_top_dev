import java.lang.annotation.Annotation;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.List;

/** Le cycle de vie d'un bean : initialisation encadrée par les post-processors, puis destruction. */
final class Lifecycle {
    private Lifecycle() { }

    static Object initialize(String name, Object bean, List<BeanPostProcessor> processors) {
        Object current = bean;
        for (BeanPostProcessor p : processors) current = p.before(name, current);
        // @PostConstruct se cherche sur l'objet d'origine : un proxy renvoyé par before n'a pas ses méthodes.
        invokeAll(bean, PostConstruct.class);
        for (BeanPostProcessor p : processors) current = p.after(name, current);
        return current;
    }

    static void destroyAll(List<Object> createdInOrder) {
        BeanException first = null;
        for (int i = createdInOrder.size() - 1; i >= 0; i--) {
            try {
                invokeAll(createdInOrder.get(i), PreDestroy.class);
            } catch (BeanException e) {
                if (first == null) first = e; else first.addSuppressed(e);
            }
        }
        if (first != null) throw first;
    }

    private static void invokeAll(Object bean, Class<? extends Annotation> marker) {
        for (Method m : bean.getClass().getDeclaredMethods()) {
            if (!m.isAnnotationPresent(marker)) continue;
            try {
                m.setAccessible(true);
                m.invoke(bean);
            } catch (InvocationTargetException e) {
                throw new BeanException("@" + marker.getSimpleName() + " " + bean.getClass().getSimpleName() + "."
                        + m.getName() + " : " + e.getCause().getMessage(), e.getCause());
            } catch (IllegalAccessException e) {
                throw new BeanException("méthode inaccessible : " + m, e);
            }
        }
    }
}
