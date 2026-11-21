import java.util.List;

/** Les définitions, modifiables au temps 1. Fourni. */
public interface DefinitionRegistry {
    List<String> names();
    BeanDefinition get(String name);
    void replace(BeanDefinition definition);
    void remove(String name);
}
