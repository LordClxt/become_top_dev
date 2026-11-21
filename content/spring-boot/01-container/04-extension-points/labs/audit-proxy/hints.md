## Hint 1
Le conteneur appelle `postProcessAfterInitialization` pour chaque bean, juste après son initialisation (`@PostConstruct` compris). Ce que tu renvoies **remplace** le bean : c'est cet objet que recevront `getBean` et toutes les injections.

## Hint 2
`Proxy.newProxyInstance(classLoader, interfaces, handler)` crée un objet qui implémente les interfaces données et envoie chaque appel au `InvocationHandler`. Dans le handler, `method.invoke(bean, args)` appelle le vrai bean. Attention : la réflexion enveloppe toute exception du bean dans une `InvocationTargetException`.

## Hint 3
`bean.getClass().isAnnotationPresent(Audited.class)` pour filtrer. Dans le handler : si `method.getDeclaringClass() != Object.class`, enregistre `type.getSimpleName() + "." + method.getName()` via `auditLog.getObject()`, puis `try { return method.invoke(bean, args); } catch (InvocationTargetException e) { throw e.getCause(); }`.
