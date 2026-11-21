## Hint 1
`controllerName` : `getClass().simpleName - 'Controller'`, puis la première lettre en minuscule (`uncapitalize()` existe dans le GDK). Pour `render`, compare `opts.keySet()` à un `Set` de clés admises. Compte les clés présentes parmi `['text', 'json', 'view']` avec `count { opts.containsKey(it) }`. Le statut se convertit avec `opts.status as Integer` (ou `toString().toInteger()`).

## Hint 2
Le script de sondage montre que les méthodes copiées depuis le trait portent l'annotation `@Traits.TraitBridge`, et que les accesseurs portent `@groovy.transform.Generated`. Une action : `!m.synthetic && Modifier.isPublic(m.modifiers) && !Modifier.isStatic(m.modifiers) && !m.isAnnotationPresent(Generated) && !m.isAnnotationPresent(Traits.TraitBridge)`. `Traits` est dans `org.codehaus.groovy.transform.trait`.

## Hint 3
Découpe l'URI avec `uri.split('/').findAll()`. Pour la liaison, `method.parameters` donne des `java.lang.reflect.Parameter` avec `name` et `type`. Convertis avec un `switch (type)` et `toString().isLong()`, `isInteger()`. Appelle l'action avec `method.invoke(controller, args as Object[])`. Après l'appel, si `!response.committed`, applique la convention de vue.
