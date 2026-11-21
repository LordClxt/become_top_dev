import java.lang.reflect.Constructor;

/** La recette d'un bean. Fourni. */
public record BeanDefinition(String name, Class<?> type, boolean prototype, boolean primary, Constructor<?> constructor) { }
