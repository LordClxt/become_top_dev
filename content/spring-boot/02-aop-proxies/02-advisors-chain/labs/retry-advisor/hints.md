## Hint 1
`StaticMethodMatcherPointcutAdvisor` est un advisor tout prêt : tu redéfinis `matches(Method, Class<?>)` (le pointcut) et tu lui donnes un advice avec `setAdvice(...)`. Dans `ProxyFactory`, l'ordre d'ajout (`addAdvice`, `addAdvisor`) est l'ordre d'exécution, du plus externe au plus interne.

## Hint 2
Avec un proxy JDK, la `Method` reçue est celle de l'**interface**, qui ne porte pas `@Retry`. `AopUtils.getMostSpecificMethod(method, targetClass)` renvoie la méthode de l'implémentation.

## Hint 3
Une `MethodInvocation` garde sa position dans la chaîne : rappeler `proceed()` sur la même invocation sauterait les intercepteurs placés après le tien. `((ProxyMethodInvocation) invocation).invocableClone().proceed()` repart du même point à chaque tentative.
