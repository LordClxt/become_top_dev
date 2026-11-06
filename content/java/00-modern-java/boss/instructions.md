## Contexte

Le service de configuration reçoit du JSON de partout : fichiers, API des partenaires, objets Java à exporter. Aujourd'hui, chaque équipe manipule des `Map<String, Object>` et se trompe sur les types (« ce `Object`, c'est un `Integer`, un `Long` ou un `Double` ? »). Tu écris la bibliothèque commune : un JSON **typé**, immuable, sans dépendance.

Pas d'indices pour ce combat.

## Le modèle

```java
sealed interface Json permits JNull, JBool, JNumber, JString, JArray, JObject { … }
record JNull() implements Json { }
record JBool(boolean value) implements Json { }
record JNumber(BigDecimal value) implements Json { }
record JString(String value) implements Json { }
record JArray(List<Json> elements) implements Json { }
record JObject(SequencedMap<String, Json> members) implements Json { }
```

- Immuables en profondeur : listes et maps copiées à la construction, non modifiables, sans `null` (un `null` lève `NullPointerException`).
- `JObject` conserve l'ordre des clés ; son `equals` est celui d'une `Map` (l'ordre ne compte pas).
- `JNumber` est **normalisé** : `1.50`, `1.5` et `15e-1` donnent des valeurs égales (`stripTrailingZeros`).

## L'API

| méthode | contrat |
|---|---|
| `static Json parse(String text)` | JSON standard (RFC 8259) : objets, tableaux, chaînes (échappements `\" \\ \/ \b \f \n \r \t \uXXXX`), nombres (`-?`, pas de zéro en tête, fraction et exposant optionnels), `true`, `false`, `null`, espaces autour. Erreur : `JsonException` dont `position()` est l'indice du premier caractère inattendu (ou la longueur du texte si la fin arrive trop tôt). Une clé en double, un caractère de contrôle brut dans une chaîne ou du texte après la valeur sont des erreurs. |
| `String render()` | forme compacte : aucun espace, clés dans l'ordre, nombres en `toPlainString()`, chaînes avec `"` `\` échappés, `\b \f \n \r \t` pour ces contrôles et `\u00xx` (hexadécimal minuscule) pour les autres caractères < 0x20 ; le reste tel quel. `parse(x.render())` redonne une valeur égale à `x`. |
| `Optional<Json> at(String path)` | chemin `commandes[0].lignes[2].sku` : des clés séparées par `.`, chacune suivie de zéro ou plusieurs `[indice]` ; un chemin peut commencer par `[indice]` ; `""` désigne la valeur elle-même. Clé absente, indice hors limites ou mauvais type : `Optional.empty()`. Chemin mal formé (`a..b`, `a[x]`, `a[`, `.a`) : `IllegalArgumentException`. |
| `static Json from(Object value)` | `null` → `JNull` ; un `Json` tel quel ; `Boolean` ; `String` ; `Byte`, `Short`, `Integer`, `Long`, `BigInteger`, `BigDecimal` ; `Float` et `Double` finis (sinon `IllegalArgumentException`) ; `List<?>` et `Map<?, ?>` récursivement (clés `String` uniquement, ordre d'itération de la map conservé). Tout autre type : `IllegalArgumentException` qui nomme la classe. |

## Robustesse

Des tableaux imbriqués sur 1 000 niveaux, des chaînes de 100 000 caractères et des tableaux de 100 000 éléments doivent passer, aller et retour, en moins d'une seconde.

`JsonException` est fournie. Tout le reste va dans `Json.java`.
