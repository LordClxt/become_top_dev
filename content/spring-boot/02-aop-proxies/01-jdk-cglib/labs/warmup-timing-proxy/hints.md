## Hint 1
`new ProxyFactory(target)` crée une fabrique pour cette cible ; `addAdvice(...)` lui ajoute un comportement ; `getProxy()` fabrique le proxy.

## Hint 2
Le comportement est un `org.aopalliance.intercept.MethodInterceptor` : une lambda qui reçoit une `MethodInvocation`. `invocation.proceed()` appelle la cible, `invocation.getMethod()` donne la méthode appelée.

## Hint 3
Lis l'heure avant `proceed()` et enregistre la mesure dans un bloc `finally`. Le nom de la classe vient de `target.getClass().getSimpleName()`, calculé une fois, avant de créer le proxy.
