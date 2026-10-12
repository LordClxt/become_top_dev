## Contexte

Dans un contrôleur Grails, `new Person(params)` ou `bindData(person, params)` remplit un objet à partir des paramètres de la requête. Or une requête HTTP ne transporte **que du texte** : `age=36`, `active=on`, `balance=12.50`. Le *data binder* convertit ce texte vers le type de chaque propriété, et note les erreurs au lieu de planter.

Tu écris celui de **Minigrails** dans `Binder.groovy`. Il reprend les règles par défaut du binder de Grails 7, telles que décrites dans sa documentation :

- les chaînes sont **nettoyées** (`trim`) avant la liaison (`grails.databinding.trimStrings`, vrai par défaut) ;
- une chaîne vide devient **`null`** (`grails.databinding.convertEmptyStringsToNull`, vrai par défaut) ;
- seules les propriétés **d'instance typées** sont liées (pas les `static`, pas les `def`) ;
- une conversion ratée produit le code d'erreur **`typeMismatch`**.

## Jalon 1 : `Binder.convert(Class type, Object raw)`

- `raw` déjà du bon type (ou `null`) : renvoyé tel quel.
- `raw` texte : `trim`, puis chaîne vide → `null`, puis conversion vers `String`, `Integer`/`int`, `Long`/`long`, `BigDecimal`, `Boolean`/`boolean`.
- Booléens acceptés : `true`, `on`, `yes`, `1` → `true` ; `false`, `off`, `no`, `0` → `false` (casse ignorée). Tout autre texte est une erreur.
- Conversion impossible (ou type non géré) : `IllegalArgumentException`.

## Jalon 2 : `Binder.bind(Object target, Map params)`

Pour chaque propriété **typée, non statique et modifiable** de `target` dont le nom est une clé de `params` :

- convertis la valeur et affecte-la ;
- si la valeur convertie est `null` et que la propriété est d'un type primitif (`int`, `boolean`…), **ne touche à rien** ;
- si la conversion échoue, note `nom → 'typeMismatch'` et **continue** avec les autres propriétés.

Les clés de `params` qui ne correspondent à aucune propriété sont ignorées. `bind` renvoie la map des erreurs (vide si tout va bien).

## Jalon 3 : `bind(target, params, [include: […], exclude: […]])`

Un attaquant peut ajouter `role=ADMIN` à n'importe quelle requête. Comme `bindData` de Grails, `bind` accepte un troisième paramètre optionnel :

- `include` : si présent, **seules** ces propriétés peuvent être liées ;
- `exclude` : ces propriétés ne sont jamais liées (prioritaire sur `include`).
