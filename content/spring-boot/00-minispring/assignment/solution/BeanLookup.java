import java.util.List;

/** Ce que le conteneur offre à la résolution des dépendances. Fourni. */
public interface BeanLookup {
    /** Les définitions dont la classe est affectable au type demandé, dans l'ordre d'enregistrement. */
    List<BeanDefinition> candidates(Class<?> type);

    /** Le bean d'une définition : le singleton en cache, ou un nouveau prototype. */
    Object obtain(BeanDefinition definition);
}
