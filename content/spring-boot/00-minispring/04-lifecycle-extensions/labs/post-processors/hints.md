## Hint 1
`bean.getClass().getDeclaredMethods()`, `m.isAnnotationPresent(PostConstruct.class)`, `m.setAccessible(true)` puis `m.invoke(bean)`. Garde deux variables : l'objet d'origine (pour les annotations) et l'objet courant (qui traverse les processeurs).

## Hint 2
L'ordre inverse vient gratuitement de l'ordre de création : un objet est toujours créé après ce dont il dépend, donc le détruire avant eux est sûr. Parcours la liste à l'envers.

## Hint 3
Une exception levée par la méthode appelée arrive dans une `InvocationTargetException` (`getCause()`). Pour continuer malgré une erreur : garde la première `BeanException`, ajoute les suivantes avec `addSuppressed`, et lève-la après la boucle.
