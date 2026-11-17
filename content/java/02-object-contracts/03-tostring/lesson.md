---
id: java-ch02-l03
title: "toString : écrire pour celui qui débogue à 3 h du matin"
source: { chapter: 3, pages: "55-57" }
duration_min: 25
concepts:
  - id: java-tostring-informative
    label: "Un toString informatif : toute l'information utile, ou un résumé lisible si l'objet est gros"
  - id: java-tostring-format-spec
    label: "Spécifier le format (classe valeur, avec fabrique parse assortie) ou annoncer qu'il peut changer"
  - id: java-tostring-accessors
    label: "Toujours fournir des accesseurs pour ce que montre toString : sinon le format devient une API de fait"
glossary:
  - term: "représentation textuelle"
    definition: "La chaîne renvoyée par toString, utilisée par println, la concaténation, les logs, le débogueur et les messages d'assertion."
  - term: "aller-retour (round trip)"
    definition: "Propriété d'un format spécifié : parse(x.toString()) redonne un objet égal à x."
  - term: "API de fait"
    definition: "Comportement non documenté dont des clients dépendent quand même, et qu'on ne peut donc plus changer."
visuals: [java-ch02-tostring-surfaces]
labs: [java-ch02-l03-lab-phone-format]
extra: false
xp: 20
checkpoints:
  - id: c1
    type: code-output
    prompt: "PhoneNumber a le toString au format spécifié ci-dessus. Qu'affiche ce programme ?"
    code: |
      import java.util.*;

      public class Main {
          static final class PhoneNumber {
              final int areaCode, prefix, lineNum;
              PhoneNumber(int areaCode, int prefix, int lineNum) {
                  this.areaCode = areaCode; this.prefix = prefix; this.lineNum = lineNum;
              }
              @Override public String toString() {
                  return String.format("%03d-%03d-%04d", areaCode, prefix, lineNum);
              }
          }

          public static void main(String[] args) {
              Map<String, PhoneNumber> contacts = new TreeMap<>();
              contacts.put("Jenny", new PhoneNumber(7, 86, 123));
              System.out.println("contacts=" + contacts);
          }
      }
    answer: "contacts={Jenny=007-086-0123}"
    explanation: "La map appelle le toString de chaque valeur pour s'afficher : ton format se propage tout seul dans les conteneurs. %03d et %04d complètent par des zéros à gauche, ce qui garantit 12 caractères, comme promis par la Javadoc."
    concept: java-tostring-format-spec
  - id: c2
    type: single
    prompt: "Un test échoue avec « expected: <12.50> but was: <12.50> ». Money compare `amount` et `currency` dans equals. Quel est le bug le plus probable ?"
    choices:
      - "assertEquals compare les références au lieu d'appeler equals"
      - "Les deux montants diffèrent après la deuxième décimale"
      - "toString n'affiche pas `currency` : les deux Money diffèrent par la devise, invisible dans le message"
      - "hashCode est incohérent avec equals"
    answer: 2
    explanation: "assertEquals appelle bien equals, puis toString pour composer le message : si la chaîne omet un champ comparé, deux valeurs différentes s'affichent pareil. Le message est honnête, c'est ta représentation qui cache la différence."
    concept: java-tostring-informative
  - id: c3
    type: single
    prompt: "`log.debug(\"Commande \" + order)` est appelé alors que le niveau DEBUG est désactivé, et `Order.toString` interroge le stock par le réseau. Que se passe-t-il ?"
    choices:
      - "Rien : le logger voit que DEBUG est coupé et n'appelle pas toString"
      - "L'appel réseau a lieu quand même : la chaîne est construite avant d'entrer dans debug"
      - "Le compilateur supprime l'appel puisque le niveau est désactivé"
      - "toString est appelé, mais seulement au premier log"
    answer: 1
    explanation: "Java évalue les arguments avant l'appel : la concaténation, donc toString, s'exécute avant que le logger puisse tester son niveau. D'où la règle : un toString rapide et sans effet de bord (et les messages paramétrés des loggers, qui repoussent la mise en forme)."
    concept: java-tostring-informative
---

## Pourquoi c'est important

Une alerte réveille l'astreinte. Le log dit :

```text
Échec de l'envoi à PhoneNumber@1b6d3586 : quota dépassé pour {Client@4554617c=[Order@74a14482, Order@1540e19d]}
```

Impossible de savoir quel client, quel numéro, quelles commandes. Le `toString` hérité d'`Object` (nom de classe, `@`, hash en hexadécimal) est concis, mais il ne dit **rien** de la valeur. Personne n'appelle `toString` exprès : ce sont les logs, la concaténation, `println`, le débogueur et les rapports de test qui l'appellent pour toi. Et le pire message de test qui soit :

```text
attendu {abc, 123}, obtenu {abc, 123}
```

Un `toString` qui n'affiche pas tout ce qu'`equals` compare produit exactement ça.

## Le concept

Modèle mental : `toString` n'est pas écrit pour ton code, il est écrit pour **un humain qui lit une trace** sans pouvoir poser de question. Tout ce qu'il doit savoir pour distinguer deux objets doit être dans la chaîne, et rien de ce qu'il ne doit pas voir.

::visual{id="java-ch02-tostring-surfaces"}

### Ce qu'un bon toString contient

:::compare
--- bad: Hérité d'Object
```text
{Jenny=PhoneNumber@163b91}
```
Le nom de la classe et un nombre : aucune valeur.
--- good: Redéfini
```text
{Jenny=707-867-5309}
```
La valeur elle-même, lisible partout où l'objet apparaît.
:::

**Toute l'information intéressante**, quand c'est raisonnable : `707-867-5309`, `12.50 EUR`, `CDG→JFK 2026-12-24`. Si l'objet est gros ou peu adapté au texte, un **résumé** qui se suffit à lui-même : `Annuaire Paris (1 487 536 entrées)`. Le bénéfice se propage : une `Map<String, PhoneNumber>` s'affiche `{Jenny=707-867-5309}` au lieu de `{Jenny=PhoneNumber@163b91}`.

### Spécifier le format… ou pas

C'est **la** décision à prendre, et à documenter dans la Javadoc.

**Format spécifié** (recommandé pour une classe valeur) : la chaîne devient une représentation standard, lisible, réutilisable dans un CSV ou un fichier de configuration. Fournis alors la **fabrique inverse** (`parse`, `valueOf`, `of`) pour faire l'aller-retour, comme `BigDecimal`, `Duration` ou `LocalDate`.

:::steps
```java
/**
 * Renvoie ce numéro au format « XXX-YYY-ZZZZ » (12 caractères), chaque partie
 * complétée à gauche par des zéros : le numéro de ligne 123 s'écrit « 0123 ».
 */
@Override public String toString() {
    return String.format("%03d-%03d-%04d", areaCode, prefix, lineNum);
}
```
--- 1-4: La Javadoc **est** le contrat : elle fixe la forme exacte, la longueur et le traitement des petits nombres. Un client peut s'y fier pour parser.
--- 2-3: L'exemple précis (« 0123 ») lève l'ambiguïté que la règle seule laisserait.
--- 5: `@Override` : tu remplaces bien `Object.toString()`, utilisé par `println`, la concaténation, les logs et le débogueur.
--- 6: `%03d` et `%04d` complètent par des zéros : la sortie fait toujours 12 caractères, ce qui rend la fabrique inverse `parse` simple et l'aller-retour garanti.
:::

Le prix : tu es lié à ce format **à vie**. Des clients vont le parser, le stocker, l'envoyer à d'autres systèmes.

::checkpoint{id="c1"}

**Format non spécifié** : dis-le explicitement, avec un exemple typique.

```java
/**
 * Renvoie une description courte de la potion. Le détail du format n'est pas
 * spécifié et peut changer ; exemple typique :
 * « [Potion #9 : type=amour, odeur=térébenthine] »
 */
```

Celui qui parse cette chaîne malgré l'avertissement ne pourra s'en prendre qu'à lui.

:::reveal Avant de lire la suite : ton format est « non spécifié », mais ta classe n'expose aucun getter. Que vont faire tes clients ?
Ils vont découper ta chaîne avec `split` ou une regex, puisque c'est le seul moyen d'obtenir la valeur.
:::

### Les accesseurs ne sont pas optionnels

Spécifié ou non, **tout ce que montre `toString` doit être accessible autrement**. Si `PhoneNumber` n'a pas d'accesseur `areaCode()`, les clients découperont la chaîne. Ton format « non spécifié » devient alors une API de fait, et tu ne pourras plus le changer sans casser du code que tu n'as jamais vu.

### Où ne pas en écrire

- Dans une classe utilitaire statique (aucune instance n'existe).
- Dans la plupart des enums : `name()` convient très bien.
- En revanche, **oui** dans une classe abstraite dont toutes les sous-classes partagent une représentation (c'est ce que fait `AbstractCollection`).

Les `toString` générés (IDE, record) affichent chaque champ : parfaits pour une `Potion`, inadaptés pour un `PhoneNumber` qui a une écriture standard. Mais même générés, ils valent infiniment mieux que celui d'`Object`.

> **Attention :** « chaque champ », c'est aussi le champ `password` ou `apiToken`. Un `record Credentials(String user, String password)` affiche le mot de passe en clair dans le premier log qui le concatène. Pour une classe qui porte un secret, écris le `toString` à la main et masque la valeur (`password=***`).

Retour au message de test du début : il trahit presque toujours un champ comparé par `equals` mais absent de `toString`.

::checkpoint{id="c2"}

## Sous le capot : qui appelle `toString`, et comment

:::reveal Avant de lire : que représente le nombre après le « @ » ?
Un `hashCode` en hexadécimal, pas une adresse mémoire.
:::

Le `toString` d'`Object` est littéralement :

```java
getClass().getName() + "@" + Integer.toHexString(hashCode())
```

Le nombre affiché est donc le **hash d'identité** (ou le tien si tu as redéfini `hashCode`) : il ne dit rien de l'adresse mémoire, contrairement à une idée répandue, et deux objets différents peuvent afficher le même.

Depuis Java 9, `"Envoi à " + phone` n'est plus compilé en `StringBuilder` : `javac` émet une instruction `invokedynamic` vers `StringConcatFactory`, qui génère au premier appel une stratégie de concaténation optimisée. Elle passe par `String.valueOf(phone)`, qui renvoie `"null"` pour une référence nulle et appelle `toString()` sinon. Deux conséquences :

- concaténer une référence `null` ne lève pas d'exception ; appeler `phone.toString()` directement, si ;
- un `toString` **coûteux ou qui lève une exception** est déclenché par chaque log, même de niveau `DEBUG` si le message est construit avant le test de niveau. Garde-le rapide, sans effet de bord, et sans appel réseau.

::checkpoint{id="c3"}

Les collections se protègent d'elles-mêmes : une liste qui se contient affiche `(this Collection)` au lieu de boucler à l'infini. Ton `toString`, lui, n'a pas ce garde-fou : deux objets qui s'affichent mutuellement donnent un `StackOverflowError`.

Un record affiche `PhoneNumber[areaCode=707, prefix=867, lineNum=5309]` : un format **non spécifié** par la Javadoc de `Record`, donc à ne jamais parser.

## Pièges fréquents

- **Garder le `toString` d'`Object`** dans une classe valeur : logs et rapports de test inutilisables.
- **Spécifier un format sans fabrique inverse**, ou sans aller-retour garanti.
- **Ne pas fournir d'accesseurs** : les clients parsent ta chaîne.
- **Omettre un champ comparé par `equals`** : « attendu X, obtenu X ».
- **`toString` coûteux ou qui lève** : il s'exécute dans les logs et le débogueur.
- **Afficher des secrets** (mot de passe, jeton, numéro de carte) : `toString` finit dans les logs.

## À retenir

- Redéfinis `toString` dans toute classe instanciable (sauf si la classe mère l'a fait) : toute l'information utile, ou un résumé lisible.
- Décide et **documente** : format spécifié (avec `parse` et aller-retour) ou format susceptible de changer.
- Fournis des accesseurs pour tout ce que la chaîne affiche.
- Rapide, sans effet de bord, sans secret.

> **Source :** *Effective Java*, 3e éd., item 12 (pages 55 à 57).
