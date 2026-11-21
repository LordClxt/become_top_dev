import java.lang.reflect.Constructor;
import java.util.List;

/** La recette d'un bean. */
public record BeanDefinition(String name, Class<?> type, Constructor<?> constructor) {
    public List<Class<?>> dependencies() { return List.of(constructor.getParameterTypes()); }
}
