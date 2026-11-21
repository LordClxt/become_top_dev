import java.lang.reflect.Constructor;
import java.util.List;

/** La recette d'un bean : son nom, sa classe, sa portée et le constructeur à appeler. */
public record BeanDefinition(String name, Class<?> type, boolean prototype, Constructor<?> constructor) {

    public List<Class<?>> dependencies() {
        return List.of(constructor.getParameterTypes());
    }
}
