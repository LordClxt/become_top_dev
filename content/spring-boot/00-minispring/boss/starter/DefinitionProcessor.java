/** L'équivalent d'un BeanFactoryPostProcessor : modifie les définitions avant toute création. Fourni. */
public interface DefinitionProcessor {
    void process(DefinitionRegistry registry);
}
