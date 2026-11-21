## Hint 1
`@EnableAspectJAutoProxy` sur la configuration enregistre le composant qui lit les `@Aspect`. Mais un `@Aspect` n'est pris en compte que s'il est lui-même un **bean** : déclare-le avec une méthode `@Bean`.

## Hint 2
L'expression `@annotation(timed)` vise les méthodes annotées, et « lie » l'annotation trouvée à un paramètre du conseil nommé `timed`, de type `Timed`. Tu lis alors `timed.value()` directement.

## Hint 3
`@Around("@annotation(timed)") public Object measure(ProceedingJoinPoint call, Timed timed) throws Throwable` : lis l'heure, appelle `call.proceed()`, et enregistre la mesure dans un `finally`, avec un résultat qui ne passe à `ok` qu'après un `proceed()` réussi. Spring retrouve le paramètre `timed` même sans l'option `-parameters` : quand l'expression ne laisse aucune ambiguïté, `AspectJAdviceParameterNameDiscoverer` le déduit. Sinon, l'attribut `argNames` de `@Around` donne les noms.
