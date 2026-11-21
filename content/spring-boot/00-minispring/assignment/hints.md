## Hint 1
`List<Gateway>` arrive comme un `ParameterizedType` : `getRawType()` vaut `List.class`, `getActualTypeArguments()[0]` vaut `Gateway.class`. Un type simple arrive comme une `Class<?>`.

## Hint 2
Écris une méthode « exactement une définition pour ce type » (un candidat, sinon l'unique `@Primary`, sinon erreur) et utilise-la à deux endroits : le type simple, et l'intérieur du `get()` de `Provider`.

## Hint 3
`Provider` est une interface fonctionnelle : `return (Provider<Object>) () -> beans.obtain(single(element, beans, requester));`. La lambda ne s'exécute qu'à chaque `get()`.
