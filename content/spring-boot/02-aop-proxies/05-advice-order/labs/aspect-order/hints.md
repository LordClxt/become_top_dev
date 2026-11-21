## Hint 1
Plusieurs aspects sur la même méthode s'emboîtent comme des poupées russes. Le plus **externe** voit l'appel en premier et le résultat en dernier ; le plus **interne** est le seul à voir chaque tentative. Demande-toi lequel doit voir quoi.

## Hint 2
`@Order` sur la classe d'un aspect : la plus **petite** valeur est la plus externe. L'audit doit être le plus externe, le retry le plus interne.

## Hint 3
`@AfterReturning(pointcut = "@annotation(app.Booking)", returning = "result")` lie la valeur renvoyée au paramètre `result` ; `@AfterThrowing(..., throwing = "error")` lie l'exception. `@Before` reçoit un `JoinPoint` : `getSignature().getName()` et `getArgs()`.
