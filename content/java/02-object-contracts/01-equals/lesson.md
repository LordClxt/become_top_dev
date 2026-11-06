---
id: java-ch02-l01
title: "equals : une relation d'équivalence, pas une comparaison de champs"
source: { chapter: 3, pages: "37-49" }
duration_min: 35
concepts:
  - id: java-equals-when
    label: "Quand redéfinir equals : classe valeur avec une égalité logique, et aucune classe mère qui l'a déjà fait"
  - id: java-equals-contract
    label: "Le contrat : réflexive, symétrique, transitive, cohérente, et x.equals(null) == false"
  - id: java-equals-symmetry
    label: "Symétrie : ne jamais chercher à être égal à un type qui ne le sait pas (String, classe mère)"
  - id: java-equals-subclass-value
    label: "Impossible d'étendre une classe instanciable en ajoutant une composante de valeur sans casser equals : composition + vue"
  - id: java-equals-getclass-lsp
    label: "getClass() dans equals viole le principe de substitution de Liskov"
  - id: java-equals-recipe
    label: "La recette : ==, instanceof (avec pattern), champs significatifs, Double.compare, Objects.equals, @Override"
glossary:
  - term: "classe valeur"
    definition: "Classe dont les instances représentent une valeur (un montant, une date, un ISBN) : deux instances de même valeur sont interchangeables."
  - term: "relation d'équivalence"
    definition: "Relation réflexive, symétrique et transitive : elle partage les objets en groupes d'éléments interchangeables."
  - term: "principe de substitution de Liskov"
    definition: "Toute propriété importante d'un type doit rester vraie pour ses sous-types : un code écrit pour Point doit marcher avec n'importe quelle sous-classe de Point."
  - term: "vue"
    definition: "Méthode qui expose un objet sous un autre type sans copie, comme asPoint() qui renvoie le Point contenu dans un ColorPoint."
  - term: "pattern matching pour instanceof"
    definition: "Depuis Java 16 : `o instanceof Point p` teste le type et déclare la variable p déjà castée."
visuals: [java-ch02-equals-relations]
labs: [java-ch02-l01-lab-warmup-isbn, java-ch02-l01-lab-equals-contract]
extra: false
xp: 35
---

## Pourquoi c'est important

Un mardi, le support signale : « Le client a retiré l'article de son panier, mais il est toujours facturé. » Le code fait `panier.remove(article)`. `remove` parcourt la liste et appelle `equals` sur chaque élément… et l'`equals` de l'article, écrit à la main six mois plus tôt, renvoie `true` dans un sens et `false` dans l'autre. Aucune exception, aucun log : la collection a simplement fait ce que le contrat lui permettait de faire avec un objet qui ne le respecte pas.

`equals` a l'air d'une méthode comme une autre. C'est en réalité **un contrat** dont dépendent `List.contains`, `List.remove`, `HashSet`, `HashMap`, `Objects.equals`, les frameworks de test et la moitié du JDK. Quand tu le casses, ce n'est pas ta classe qui plante : ce sont les autres, loin de toi, de façon imprévisible.

## Le concept

### D'abord : faut-il redéfinir `equals` ?

Par défaut, `Object.equals` est l'**identité** : un objet n'est égal qu'à lui-même. C'est exactement ce qu'il faut dans beaucoup de cas :

- **chaque instance est unique par nature** : un `Thread`, une connexion, un service. Deux connexions ne sont pas « la même » parce qu'elles visent la même base ;
- **personne n'a besoin d'une égalité logique** : `Pattern` aurait pu comparer ses expressions, ses concepteurs ont jugé que ça ne servait à rien ;
- **une classe mère l'a déjà fait correctement** : les `Set` héritent leur `equals` d'`AbstractSet`, les `List` d'`AbstractList` ;
- **la classe contrôle ses instances** (module 1) : une seule instance par valeur, donc identité = égalité. Les enums en sont l'exemple.

On redéfinit `equals` pour une **classe valeur** : `Money`, `Isbn`, `PhoneNumber`. Là, l'appelant veut savoir si deux objets **représentent la même chose**, pas s'ils sont le même objet en mémoire. C'est aussi ce qui permet de les utiliser comme clés de map ou éléments de set.

### Le contrat, une clause à la fois

`equals` doit être une **relation d'équivalence** sur les références non nulles :

| Clause | Ce qu'elle exige |
|---|---|
| Réflexive | `x.equals(x)` est vrai |
| Symétrique | `x.equals(y)` ⇔ `y.equals(x)` |
| Transitive | `x.equals(y)` et `y.equals(z)` ⇒ `x.equals(z)` |
| Cohérente | le résultat ne change pas tant que les objets ne changent pas |
| Non-nullité | `x.equals(null)` est faux (et ne lève rien) |

Intuition : `equals` découpe tes objets en **groupes d'éléments interchangeables**. Si un objet est dans deux groupes à la fois, ou dans un groupe selon qui pose la question, les collections ne savent plus où il est.

La réflexivité et la non-nullité se respectent presque toutes seules. Les deux autres se cassent très facilement, avec les meilleures intentions.

### Casser la symétrie : vouloir être aimable avec `String`

Une chaîne insensible à la casse, qui veut bien se comparer à une `String` ordinaire :

```java
// Cassé : viole la symétrie
public final class CaseInsensitiveString {
    private final String s;

    @Override public boolean equals(Object o) {
        if (o instanceof CaseInsensitiveString cis) return s.equalsIgnoreCase(cis.s);
        if (o instanceof String str) return s.equalsIgnoreCase(str);   // interopérabilité à sens unique !
        return false;
    }
}
```

`new CaseInsensitiveString("Paris").equals("paris")` vaut `true`. Mais `"paris".equals(new CaseInsensitiveString("Paris"))` vaut `false` : `String` ne connaît pas ta classe et ne la connaîtra jamais. Mets la première dans une liste, puis demande `list.contains("paris")` : le résultat dépend de **quel côté** l'implémentation de `contains` appelle `equals`. Aujourd'hui `false`, peut-être `true` dans une autre version du JDK.

La correction est de **renoncer** : une `CaseInsensitiveString` n'est égale qu'à une autre `CaseInsensitiveString`.

### Casser la transitivité : ajouter un champ dans une sous-classe

```java
public class Point {
    private final int x, y;
    @Override public boolean equals(Object o) {
        return o instanceof Point p && p.x == x && p.y == y;
    }
}

public class ColorPoint extends Point {
    private final Color color;
}
```

Comment `ColorPoint` doit-il comparer ? Toutes les options échouent :

1. **Ne rien redéfinir** : la couleur est ignorée. Légal, mais faux pour le métier.
2. **Exiger un `ColorPoint`** (`o instanceof ColorPoint cp && super.equals(o) && cp.color == color`) : `point.equals(colorPoint)` vaut `true` (le `Point` ignore la couleur), `colorPoint.equals(point)` vaut `false`. **Symétrie cassée.**
3. **Comparer « sans couleur » face à un simple `Point`** : la symétrie est rétablie, mais avec `rouge(1,2)`, `point(1,2)` et `bleu(1,2)`, on a rouge = point, point = bleu… et rouge ≠ bleu. **Transitivité cassée.** Pire : deux sous-classes qui font ce même calcul (`ColorPoint` et `SmellPoint`) s'appellent l'une l'autre à l'infini : `StackOverflowError`.

::visual{id="java-ch02-equals-relations"}

C'est un résultat fondamental, pas un manque d'astuce : **on ne peut pas étendre une classe instanciable en ajoutant une composante de valeur tout en respectant le contrat d'`equals`.**

### La fausse bonne idée : `getClass()`

```java
@Override public boolean equals(Object o) {
    if (o == null || o.getClass() != getClass()) return false;   // cassé autrement
    ...
}
```

Symétrique et transitif, oui. Mais une sous-classe qui **n'ajoute aucune valeur** (un `CounterPoint` qui compte ses instances) n'est plus jamais égale à un `Point` de mêmes coordonnées. Un `Set.of(new Point(1, 0), …)` ne la « contient » plus. C'est une violation du **principe de substitution de Liskov** : un `CounterPoint` est un `Point` et doit se comporter comme tel partout où on attend un `Point`.

### La vraie solution : la composition

On ne fait pas hériter `ColorPoint` de `Point` : on lui **donne** un `Point`, et une **vue** pour ceux qui en ont besoin.

```java
public final class ColorPoint {
    private final Point point;
    private final Color color;

    public Point asPoint() { return point; }   // vue : le ColorPoint « vu comme » un Point

    @Override public boolean equals(Object o) {
        return o instanceof ColorPoint cp && cp.point.equals(point) && cp.color.equals(color);
    }
}
```

Un `ColorPoint` n'est jamais égal à un `Point`, et c'est cohérent dans les deux sens. Qui veut comparer les positions écrit `cp.asPoint().equals(p)` : l'intention est explicite. On reviendra à « composition plutôt qu'héritage » au module 4.

Deux remarques :

- le problème disparaît si la classe mère est **abstraite** : on ne peut pas créer de `Shape` nue, donc `Circle` et `Rectangle` peuvent chacune ajouter leurs champs ;
- le JDK lui-même s'est trompé : `java.sql.Timestamp` étend `java.util.Date` en ajoutant les nanosecondes, et son `equals` n'est pas symétrique. La Javadoc te supplie de ne pas mélanger les deux.

### Cohérence : ne dépends que de la mémoire

`java.net.URL.equals` compare les **adresses IP** des hôtes, ce qui demande une résolution DNS. Le résultat change selon le réseau, et peut bloquer. C'est une erreur historique qu'on ne peut plus corriger. Règle : `equals` ne fait que des **calculs déterministes sur des objets en mémoire**. (Utilise `URI` plutôt qu'`URL` comme clé.)

### La recette

```java
@Override
public boolean equals(Object o) {
    if (o == this) return true;                         // 1. raccourci (optimisation)
    if (!(o instanceof PhoneNumber pn)) return false;   // 2. type + cast ; null donne false tout seul
    return pn.lineNum == lineNum                        // 3. champs significatifs,
        && pn.prefix == prefix                          //    les plus discriminants d'abord
        && pn.areaCode == areaCode;
}
```

Pour chaque champ significatif :

- primitif (sauf `float`/`double`) : `==` ;
- `float` / `double` : `Float.compare` / `Double.compare`, **pas** `==` (à cause de `NaN` et de `-0.0`, voir « Sous le capot ») ;
- référence : `equals` récursif, ou `Objects.equals(a, b)` si elle peut être `null` ;
- tableau : `Arrays.equals`.

Et trois réflexes :

- **`@Override` toujours.** `public boolean equals(PhoneNumber o)` (sans `@Override`) ne redéfinit pas `equals(Object)` : il le **surcharge**. Ton code qui fait `a.equals(b)` avec deux `PhoneNumber` marche ; `HashSet`, qui appelle `equals(Object)`, utilise toujours l'identité. Avec `@Override`, le compilateur refuse.
- **Ne sois pas trop malin.** Compare des champs, n'essaie pas de deviner des équivalences (un `File` ne cherche pas à savoir si deux chemins sont le même lien symbolique).
- **Teste** la symétrie et la transitivité, ou fais générer le code.

### Depuis Java 16 : les records *(extra)*

```java
public record PhoneNumber(short areaCode, short prefix, short lineNum) { }
```

Un `record` génère `equals`, `hashCode` et `toString` à partir de ses composants, en suivant exactement cette recette (`Double.compare` compris). C'est la réponse moderne à « écrire `equals` est fastidieux » (le livre citait AutoValue). Un record est `final` : le problème des sous-classes ne se pose pas. On les étudiera au module 3 ; d'ici là, sache les reconnaître.

## Sous le capot : `==` et `Double.compare` ne sont pas d'accord

Pour les `double`, le langage suit la norme IEEE 754, qui dit deux choses surprenantes :

```java
double nan = 0.0 / 0.0;
nan == nan;            // false : NaN n'est égal à rien, pas même à lui-même
0.0 == -0.0;           // true : les deux zéros sont « égaux »
Double.compare(nan, nan);    // 0 : même valeur
Double.compare(0.0, -0.0);   // 1 : deux valeurs distinctes
```

Un `equals` qui compare un champ `double` avec `==` n'est donc **pas réflexif** dès que le champ vaut `NaN` : l'objet n'est pas égal à lui-même, et `list.contains(objet)` renvoie `false` juste après `list.add(objet)`.

`Double.compare` (et `Double.equals`) comparent en réalité la représentation binaire : `doubleToLongBits(a) == doubleToLongBits(b)`. Tous les `NaN` sont ramenés à une seule représentation canonique, et `0.0` (bits `0x0000…`) diffère de `-0.0` (bit de signe à 1). C'est ce choix qui rend `equals` réflexif, et c'est celui que fait le `equals` généré d'un record. Évite `Double.valueOf(a).equals(b)` : même résultat, mais un objet créé à chaque comparaison.

## Pièges fréquents

- **Comparer avec une classe que tu ne contrôles pas** (`String`, classe mère) : la symétrie casse forcément.
- **Ajouter un champ significatif dans une sous-classe** d'une classe instanciable : passe par la composition et une vue.
- **`getClass()` au lieu d'`instanceof`** : les sous-classes « neutres » cessent d'être substituables.
- **Surcharger `equals(MaClasse)`** au lieu de redéfinir `equals(Object)` : `@Override` sur chaque redéfinition.
- **`==` sur des `double`**, ou `equals` sur des champs qui peuvent être `null` : `Double.compare`, `Objects.equals`.
- **Dépendre du réseau, de l'heure ou d'un état mutable partagé** : la cohérence n'est plus garantie.
- **Oublier `hashCode`** : c'est la leçon suivante, et c'est obligatoire.

## À retenir

- Ne redéfinis `equals` que pour une classe valeur dont aucune classe mère n'a déjà défini l'égalité.
- Le contrat est une relation d'équivalence : réflexive, symétrique, transitive, cohérente, `equals(null) == false`.
- Une composante de valeur en plus ? **Composition + vue**, pas héritage. `getClass()` n'est pas la solution.
- Recette : `==`, `instanceof` avec pattern, champs significatifs (`Double.compare`, `Objects.equals`, `Arrays.equals`), `@Override`.
- En Java moderne, un `record` écrit ce code pour toi.

> **Source :** *Effective Java*, 3e éd., item 10 (pages 37 à 49).
