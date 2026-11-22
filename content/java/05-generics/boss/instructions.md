## Contexte

Ordo reçoit des données de partout (fichiers CSV, messages JSON, API partenaires) et passe son temps à convertir : une chaîne en `BigDecimal`, un nombre en texte, un `CharSequence` en longueur… Chaque module a ses propres `if (x instanceof …)` et ses casts. Tu écris un registre central de convertisseurs, que tout le monde pourra utiliser sans un seul cast.

Pas d'indices pour ce combat : tout ce qu'il faut est dans les cinq leçons du module.

## Les règles

- `register(from, to, f)` enregistre une conversion. `f` peut être plus générale à l'entrée (une `Function<Object, String>` pour convertir des `Integer`) ou plus précise à la sortie (une `Function<String, BigDecimal>` pour produire des `Number`).
- `convert(value, to)` renvoie un `T`, sans cast chez l'appelant. Il cherche un convertisseur pour le type exact de `value`, puis pour ses super-types, **le plus proche d'abord** (super-classes et interfaces). À défaut, si `value` est déjà un `T`, il la renvoie telle quelle ; sinon `IllegalArgumentException`, dont le message nomme les deux types.
- `tryConvert(value, to)` fait de même, mais renvoie un `Optional` vide au lieu de lever.
- `converter(from, to)` renvoie une `Function<S, T>` typée.
- Un convertisseur glissé par un type brut, qui produirait un objet du mauvais type, ne doit **jamais** livrer cet objet : `ClassCastException` à la conversion.
- `Converters.java` compile avec `-Xlint:all -Werror` : aucun cast non vérifié, aucun `@SuppressWarnings`. `Converters` est finale.
