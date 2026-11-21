## Hint 1
Tout passe par l'objet `Class<?>` : `isAnnotationPresent`, `getAnnotation`, `getSimpleName`, `getDeclaredConstructors`. Un `Constructor` donne ses paramètres avec `getParameterTypes()`.

## Hint 2
La règle des deux majuscules est celle des JavaBeans : le JDK la fournit déjà dans `java.beans.Introspector.decapitalize`.

## Hint 3
`getDeclaredConstructors()` renvoie aussi le constructeur implicite d'une classe sans constructeur écrit. Avec plusieurs constructeurs, filtre ceux qui portent `@Inject` et exige qu'il en reste exactement un.
