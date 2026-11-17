---
id: java-ch02-l02
title: "hashCode : la moitié qu'on oublie"
source: { chapter: 3, pages: "50-54" }
duration_min: 40
concepts:
  - id: java-hashcode-contract
    label: "Le contrat : objets égaux ⇒ même hashCode ; stable tant que l'objet ne change pas ; collisions permises mais coûteuses"
  - id: java-hashcode-recipe
    label: "La recette : result = 31 * result + c sur chaque champ significatif (Type.hashCode, hashCode récursif, Arrays.hashCode)"
  - id: java-hashcode-quality
    label: "Qualité : un hash constant ou qui ignore un champ significatif transforme la table en liste (temps quadratique)"
  - id: java-hashcode-caching
    label: "Objects.hash est lent (tableau + boxing) ; mise en cache paresseuse du hash pour un objet immuable coûteux"
  - id: java-mutable-key
    label: "Une clé modifiée après insertion change de hash : l'entrée devient introuvable"
  - id: java-hashmap-internals
    label: "HashMap : dispersion h ^ (h >>> 16), index (n - 1) & hash, hash mémorisé par entrée, arbres à partir de 8 collisions"
glossary:
  - term: "code de hachage"
    definition: "Entier calculé à partir de l'état d'un objet, utilisé par les tables de hachage pour choisir un compartiment."
  - term: "compartiment (bucket)"
    definition: "Case du tableau interne d'une HashMap ; les entrées dont les hash tombent sur la même case y sont chaînées."
  - term: "collision"
    definition: "Deux clés différentes qui tombent dans le même compartiment. Permise, mais chaque collision coûte une comparaison."
  - term: "facteur de charge"
    definition: "Rapport entrées / compartiments au-delà duquel la table double de taille (0,75 par défaut)."
visuals: [java-ch02-hash-buckets]
labs: [java-ch02-l02-lab-hash-keys, java-ch02-l02-lab-forgetful-cache]
extra: false
xp: 35
checkpoints:
  - id: c1
    type: single
    prompt: "`Username` compare `name` avec `equalsIgnoreCase` dans equals, mais son hashCode renvoie `name.hashCode()`. Après `set.add(new Username(\"Ana\"))` dans un HashSet, que renvoie `set.contains(new Username(\"ANA\"))` ?"
    choices:
      - "true : equals dit que les deux noms sont égaux"
      - "Presque toujours false : les hash diffèrent, HashSet cherche ailleurs et n'appelle même pas equals"
      - "Une exception, car le contrat est violé"
      - "true, mais plus lentement à cause de la collision"
    answer: 1
    explanation: "\"Ana\" et \"ANA\" n'ont pas le même hashCode de String : la recherche part dans un autre compartiment, et même dans le même, le hash mémorisé différent fait sauter equals. Croire que equals « a le dernier mot » est le piège : dans une table de hachage, le hash passe d'abord."
    concept: java-hashcode-contract
  - id: c2
    type: code-output
    prompt: "Deux façons de combiner les champs d'un siège. Qu'affiche ce programme ?"
    code: |
      public class Main {
          record Seat(int row, int col) {
              int sumHash() { return row + col; }
              int recipeHash() { return 31 * Integer.hashCode(row) + Integer.hashCode(col); }
          }

          public static void main(String[] args) {
              Seat a = new Seat(1, 2), b = new Seat(2, 1);
              System.out.println((a.sumHash() == b.sumHash()) + " " + (a.recipeHash() == b.recipeHash()));
          }
      }
    answer: "true false"
    explanation: "Une simple somme est commutative : (1,2) et (2,1), et toute la diagonale, collisionnent. Multiplier le résultat partiel par 31 avant d'ajouter le champ suivant rend la position de chaque champ significative : 33 contre 63."
    concept: java-hashcode-recipe
  - id: c3
    type: single
    prompt: "Avec le cache paresseux ci-dessus, une instance dont le calcul complet donne exactement 0. Que se passe-t-il ?"
    choices:
      - "hashCode renvoie une valeur fausse pour cette instance"
      - "La HashMap lève une exception sur un hash nul"
      - "Le résultat reste juste, mais il est recalculé à chaque appel : le cache ne sert plus à rien pour elle"
      - "Le hash est mis en cache comme les autres"
    answer: 2
    explanation: "0 sert de marqueur « pas encore calculé » : pour cette instance, le test result == 0 est toujours vrai, donc on recalcule, sans jamais se tromper. C'est un coût, pas un bug, et c'est pourquoi la valeur 0 doit être rare."
    concept: java-hashcode-caching
---

## Pourquoi c'est important

Tu viens d'écrire un `equals` impeccable pour `PhoneNumber`. Tu fais :

```java
Map<PhoneNumber, String> annuaire = new HashMap<>();
annuaire.put(new PhoneNumber(707, 867, 5309), "Jenny");
annuaire.get(new PhoneNumber(707, 867, 5309));   // null
```

`null`. Les deux numéros sont égaux, mais `HashMap` ne les compare jamais : elle cherche dans le **mauvais compartiment**, parce que le `hashCode` hérité d'`Object` donne deux nombres sans rapport pour deux objets distincts. **Toute classe qui redéfinit `equals` doit redéfinir `hashCode`.** Ce n'est pas une bonne pratique : c'est le contrat.

## Le concept

### Le contrat

Modèle mental d'abord : une `HashMap` est un meuble à tiroirs. `hashCode` dit dans quel tiroir ranger et chercher ; `equals` dit, dans ce tiroir, quel objet est le bon. Le contrat formalise cette règle en trois points :

1. Appelé plusieurs fois sur le même objet, `hashCode` renvoie **la même valeur**, tant que rien de ce qu'utilise `equals` ne change. (D'une exécution à l'autre, la valeur peut varier.)
2. **Deux objets égaux selon `equals` ont le même `hashCode`.** C'est la clause qu'on viole en oubliant de redéfinir.
3. Deux objets différents **peuvent** avoir le même `hashCode`. Mais des valeurs bien réparties rendent les tables de hachage rapides.

Si deux objets égaux donnent deux tiroirs différents, on range dans l'un et on cherche dans l'autre.

::checkpoint{id="c1"}

::visual{id="java-ch02-hash-buckets"}

### Le pire hashCode légal

```java
@Override public int hashCode() { return 42; }   // légal… et désastreux
```

Il respecte le contrat : les objets égaux ont bien le même hash. Mais **tous** les objets tombent dans le même tiroir. Chaque `get` parcourt toutes les entrées : la table devient une liste, et un programme linéaire devient **quadratique**. Avec 100 000 clés, c'est la différence entre une milliseconde et une minute.

Même effet, plus sournois : un hash qui **ignore un champ significatif**. Avant Java 2, `String.hashCode` n'examinait que 16 caractères régulièrement espacés : sur des URL qui ne diffèrent qu'à la fin, presque tout collisionnait. Ne retire jamais un champ du calcul « pour aller plus vite ».

### La recette

:::steps
```java
@Override public int hashCode() {
    int result = Short.hashCode(areaCode);
    result = 31 * result + Short.hashCode(prefix);
    result = 31 * result + Short.hashCode(lineNum);
    return result;
}
```
--- 1: `@Override`, signature `int hashCode()` : c'est la méthode qu'appellent `HashMap` et `HashSet`.
--- 2: On part du premier champ significatif, converti en `int` par `Short.hashCode` (sans créer d'objet).
--- 3: Chaque champ suivant : on **multiplie** le résultat partiel par 31, puis on ajoute le hash du champ. Le débordement d'`int` est voulu et sans danger.
--- 4: Même geste pour le dernier champ. Ce sont exactement les champs comparés par `equals`, ni plus ni moins.
--- 5: On renvoie le résultat : déterministe, il ne dépend que de l'état de l'objet.
:::

Pour calculer `c` sur chaque champ **utilisé par `equals`** (et seulement ceux-là) :

- primitif : `Type.hashCode(f)` (`Integer.hashCode`, `Double.hashCode`…) ;
- référence : `f.hashCode()`, ou `Objects.hashCode(f)` (0 si `null`) ;
- tableau : `Arrays.hashCode(f)`.

:::reveal Avant de lire la suite : pourquoi multiplier à chaque champ, au lieu de simplement additionner ?
Parce que l'addition ne voit pas l'ordre. Vérifie-le juste en dessous.
:::

Pourquoi multiplier ? Pour que l'**ordre** compte : sans la multiplication, `"ab"` et `"ba"` auraient le même hash, comme tous les anagrammes. Pourquoi 31 ? Il est impair (multiplier par un nombre pair perdrait un bit à chaque débordement) et `31 * i == (i << 5) - i`, que la JVM optimise toute seule.

::checkpoint{id="c2"}

Un champ **dérivé** (calculable à partir des autres) peut être omis. Un champ **absent d'`equals`** doit l'être, sinon deux objets égaux auraient des hash différents.

### `Objects.hash` : pratique, mais pas gratuit

```java
@Override public int hashCode() { return Objects.hash(lineNum, prefix, areaCode); }
```

Une ligne, même qualité. Mais c'est une méthode *varargs* : à chaque appel, elle **crée un tableau** et **emballe** chaque primitif dans un objet (module 1, autoboxing). Parfait pour une classe rarement hachée ; à éviter sur une clé utilisée des millions de fois.

### Mettre le hash en cache

Si la classe est **immuable** et le calcul coûteux (un long texte, une grande collection), on peut mémoriser le résultat :

```java
private int hashCode;   // 0 = pas encore calculé

@Override public int hashCode() {
    int result = hashCode;
    if (result == 0) {
        result = ...;          // calcul complet
        hashCode = result;
    }
    return result;
}
```

`String` fait exactement ça. Seule condition : le hash d'une instance courante ne doit pas valoir 0, sinon on recalcule à chaque fois. (La sûreté de ce cache en multi-thread est traitée au module 11.)

::checkpoint{id="c3"}

### Ne promets pas la formule

`String` et `Integer` documentent la formule exacte de leur `hashCode`. Des programmes en dépendent, et le JDK ne pourra jamais l'améliorer. Toi, documente seulement le contrat : tu garderas le droit de changer de fonction.

### La clé qui change de tiroir

Le contrat dit « stable **tant que l'objet ne change pas** ». Si une clé change après insertion, son hash change, et elle devient introuvable :

:::compare
--- bad: La clé reste modifiable de l'extérieur
```java
List<String> tags = new ArrayList<>(List.of("bio"));
prix.put(tags, 12);
tags.add("vrac");     // l'entrée vient de se perdre
```
--- good: La clé est une copie immuable
```java
List<String> tags = new ArrayList<>(List.of("bio"));
prix.put(List.copyOf(tags), 12);
tags.add("vrac");     // sans effet sur la clé rangée
```
:::

Le scénario complet, ligne par ligne :

```java
List<String> key = new ArrayList<>(List.of("bio"));
Map<List<String>, Integer> prix = new HashMap<>();
prix.put(key, 12);
key.add("vrac");             // la clé a changé de hash
prix.get(key);               // null : on cherche dans le nouveau tiroir
prix.containsKey(List.of("bio"));   // false : bon tiroir, mais l'objet n'est plus égal
prix.size();                 // 1 : l'entrée est toujours là, inaccessible pour toujours
```

C'est une fuite mémoire **et** un bug fonctionnel. Règle : une clé de map ou un élément de set doit être **immuable**, ou au moins ne jamais changer pendant qu'il est dans la collection. Quand une classe reçoit une collection pour en faire une clé, elle la **copie** (`List.copyOf`).

## Sous le capot : ce que fait vraiment `HashMap.get`

Dans OpenJDK 25, `HashMap` est un tableau de compartiments dont la taille est une **puissance de 2** (16 au départ). Pour trouver le compartiment :

```java
static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}
// index = (table.length - 1) & hash
```

- `(n - 1) & hash` garde seulement les **bits de poids faible** (4 bits pour 16 cases). Un `hashCode` dont seuls les bits hauts varient tomberait toujours dans la même case : la ligne `h ^ (h >>> 16)` replie les 16 bits hauts sur les bas pour limiter ce risque.
- Chaque entrée **mémorise le hash** de sa clé. En cherchant, `HashMap` compare d'abord les hash, puis `==`, puis seulement `equals`. Conséquence : si deux objets égaux ont des hash différents, `equals` n'est **même pas appelé**, même s'ils tombent par hasard dans le même compartiment.
- Quand le nombre d'entrées dépasse 75 % de la capacité, le tableau **double** et toutes les entrées sont redistribuées.
- Quand un compartiment dépasse **8 entrées** (et que la table a au moins 64 cases), sa liste devient un **arbre rouge-noir**. Avec `return 42`, la recherche passe alors de O(n) à O(log n)… à condition que les clés soient `Comparable` (l'arbre les ordonne avec `compareTo`). Sinon, l'arbre ne sait pas les ordonner et la recherche reste presque linéaire. Ce garde-fou, ajouté en Java 8, protège aussi contre les attaques par collisions volontaires sur des clés `String`.

Tu peux donc prédire : un mauvais `hashCode` rend une `HashMap` lente, un `hashCode` **incohérent** avec `equals` la rend **fausse**.

## Pièges fréquents

- **Redéfinir `equals` sans `hashCode`** : `HashMap.get` renvoie `null` pour une clé égale.
- **Mettre dans `hashCode` un champ qu'`equals` ignore** : deux objets égaux, deux hash.
- **Retirer un champ significatif** du calcul pour aller plus vite : collisions en masse.
- **`Objects.hash` sur un chemin critique** : un tableau et des boxings par appel.
- **Modifier une clé après l'avoir insérée** (ou garder une référence à la liste qui sert de clé) : entrée perdue.
- **Documenter la formule** : tu ne pourras plus jamais la changer.

## À retenir

- `equals` redéfini ⇒ `hashCode` redéfini, sur **exactement** les mêmes champs.
- Recette : `result = 31 * result + c` ; `Type.hashCode`, `Objects.hashCode`, `Arrays.hashCode`.
- Un hash constant est légal mais transforme la table en liste ; un hash incohérent la rend fausse.
- Les clés doivent être immuables ; copie les collections que tu reçois pour en faire une clé.
- `HashMap` compare le hash mémorisé **avant** `equals`, garde les bits bas de l'index, et passe en arbre au-delà de 8 collisions.

> **Source :** *Effective Java*, 3e éd., item 11 (pages 50 à 54). Détails d'implémentation de `HashMap` : OpenJDK 25, `java.util.HashMap`.
