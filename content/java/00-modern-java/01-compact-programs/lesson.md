---
id: java-ch00-l01
title: "Du script au programme : fichiers compacts, var et blocs de texte"
source: { chapter: 1, pages: "1-3", url: "https://openjdk.org/jeps/512" }
duration_min: 35
concepts:
  - id: java-compact-source
    label: "Fichier source compact : des champs et des méthodes sans classe englobante, compilés en une classe finale implicite"
  - id: java-instance-main
    label: "Méthode main d'instance : ni public, ni static, ni String[] obligatoires ; ordre de choix du lanceur"
  - id: java-io-class
    label: "java.lang.IO : println, print et readln, branchés sur System.out et System.in"
  - id: java-module-import
    label: "import module : importer tous les paquetages exportés d'un module, et lever une ambiguïté par un import simple"
  - id: java-var
    label: "var : type inféré à la compilation pour une variable locale, toujours statique"
  - id: java-text-block
    label: "Bloc de texte : chaîne multiligne dont l'indentation commune est retirée à la compilation"
  - id: java-source-launcher
    label: "Lanceur de source : java Fichier.java compile en mémoire, et trouve les autres fichiers du dossier"
glossary:
  - term: "fichier source compact"
    definition: "Fichier .java qui contient directement des champs et des méthodes, sans déclaration de classe (Java 25, JEP 512)."
  - term: "classe implicite"
    definition: "La classe finale, sans nom utilisable, que le compilateur crée autour d'un fichier compact."
  - term: "lanceur de source"
    definition: "Le mode `java Fichier.java` : la JVM compile le source en mémoire puis l'exécute, sans .class sur le disque."
  - term: "import module"
    definition: "Déclaration `import module M;` qui importe les types publics de tous les paquetages exportés par le module M."
  - term: "espace accessoire"
    definition: "Dans un bloc de texte, l'indentation commune à toutes les lignes (y compris celle du délimiteur fermant), retirée par le compilateur."
  - term: "main d'instance"
    definition: "Méthode main non static : le lanceur crée d'abord un objet de la classe, puis appelle main dessus."
checkpoints:
  - id: c1
    type: code-output
    prompt: "Le champ est initialisé en appelant une méthode de la même instance. Qu'affiche ce fichier compact ?"
    code: |
      int n = next();

      int next() { return n + 10; }

      void main() {
          IO.println(n + " " + next());
      }
    answer: "10 20"
    explanation: "Le lanceur construit un vrai objet avant d'appeler main : l'initialiseur du champ s'exécute pendant la construction, quand n vaut encore 0, donc n devient 10, puis next() renvoie 20. Penser qu'un fichier compact est un script exécuté de haut en bas, sans objet, fait prédire une erreur."
    concept: java-instance-main
  - id: c2
    type: code-output
    prompt: "Prédis la sortie."
    code: |
      void main() {
          var x = 7;
          x = x / 2;
          IO.println(x);
      }
    answer: "3"
    explanation: "var prend le type de l'initialiseur : 7 est un int, x est un int pour toujours, et 7 / 2 est une division entière. var ne rend pas la variable dynamique et ne la « promeut » jamais en double."
    concept: java-var
  - id: c3
    type: single
    prompt: "Que se passe-t-il à la compilation ?"
    code: |
      void main() {
          String body = """{"id": 42}""";
          IO.println(body);
      }
    choices:
      - "Ça compile et affiche {\"id\": 42}"
      - "Ça compile, mais les guillemets internes doivent être échappés pour s'afficher"
      - "Erreur : après les \"\"\" ouvrants, le contenu doit commencer à la ligne suivante"
      - "Ça compile et affiche le texte avec un saut de ligne final"
    answer: 2
    explanation: "Les \"\"\" ouvrants doivent être suivis d'un saut de ligne (javac : illegal text block open delimiter sequence). Un bloc de texte n'est pas une chaîne avec d'autres guillemets : pour une seule ligne, garde une chaîne classique."
    concept: java-text-block
visuals: [java-ch00-compiler-adds]
labs: [java-ch00-l01-lab-warmup-payload, java-ch00-l01-lab-tally]
extra: true
xp: 30
---

## Pourquoi c'est important

Vendredi, 17 h. On te demande de totaliser un export de caisse : quelques centaines de lignes `article;quantité;prix`. En Java « de 2014 », il fallait une classe publique au nom du fichier, un `public static void main(String[] args)`, trois imports, une compilation, puis une exécution. Alors l'équipe l'écrit en Bash. Six mois plus tard, le script est devenu critique, quelqu'un le réécrit en Java… et recopie le bug d'arrondi qui faussait les totaux. (En Go, tu aurais juste fait `go run main.go`.)

Depuis Java 25, le même outil tient dans un fichier sans aucune cérémonie, et il **grandit** en vraie classe sans être réécrit. Ce module est un tour accéléré du Java que tu écriras dans ce cours : le livre de Bloch s'arrête à Java 9, tout ce qui suit est marqué *extra*.

## Le concept

### Un fichier compact

L'idée à retenir : **un fichier compact, c'est le corps d'une classe dont le compilateur écrit l'enveloppe**. Tu écris les champs et les méthodes ; javac ajoute la déclaration de classe et les imports. Rien d'autre ne change : c'est toujours de l'objet.

```java
// Tally.java — un fichier complet
void main() {
    var total = 0L;
    String line;
    while ((line = IO.readln()) != null) {
        total += Long.parseLong(line.strip());
    }
    IO.println("TOTAL " + total);
}
```

```bash
printf '12\n30\n' | java Tally.java      # TOTAL 42
```

Trois nouveautés, toutes **définitives** depuis Java 25 :

- **pas de classe** : un fichier qui déclare directement des champs et des méthodes est un *fichier source compact* ; le compilateur l'enveloppe dans une *classe implicite* ;
- **`main` d'instance** : ni `public`, ni `static`, ni `String[] args` obligatoires ; comme elle n'est pas `static`, le lanceur crée un objet avant de l'appeler ;
- **`IO`**, une classe de `java.lang` (donc sans import) avec cinq méthodes statiques : `print`, `println` (avec ou sans argument) et `readln` (avec ou sans invite). `readln()` renvoie `null` à la fin de l'entrée.

Un fichier compact importe automatiquement tout `java.base` : `List`, `Map`, `LocalDate`, `Path`… sont disponibles sans une ligne d'import. Les membres se voient entre eux, comme dans une classe :

```java
final Map<String, Long> totals = new LinkedHashMap<>();   // un champ d'instance

void add(String item, long cents) { totals.merge(item, cents, Long::sum); }

void main() {
    add("café", 250);
    add("café", 250);
    IO.println(totals);       // {café=500}
}
```

Active une à une les pièces ajoutées, et regarde le fichier devenir une classe ordinaire :

::visual{id="java-ch00-compiler-adds"}

::checkpoint{id="c1"}

### Faire grandir le programme

Le jour où l'outil devient du code d'équipe, tu l'entoures d'une classe et tu ajoutes l'import que le fichier compact faisait pour toi. **Le corps ne change pas** :

:::compare
--- neutral: Fichier compact (script)
```java
final Map<String, Long> totals = new LinkedHashMap<>();
void add(String item, long cents) { totals.merge(item, cents, Long::sum); }
void main() { /* … */ }
```
--- good: Classe d'équipe (même corps)
```java
import module java.base;

final class Tally {
    final Map<String, Long> totals = new LinkedHashMap<>();
    void add(String item, long cents) { totals.merge(item, cents, Long::sum); }
    void main() { /* identique */ }
}
```
:::

C'est l'idée directrice de la fonctionnalité : une rampe d'accès, pas un dialecte. Un fichier compact n'a ni `package`, ni nom utilisable : dès que d'autres classes doivent l'appeler, c'est une classe normale qu'il te faut.

### `import module`

Un *import module* est un import en gros : `import module java.sql;` importe d'un coup les types publics de **tous** les paquetages exportés par le module (`java.sql`, `javax.sql`…), plus ceux des modules qu'il rend transitivement lisibles. Pratique pour un script, mais attention aux collisions :

```java
import module java.base;   // contient java.util.Date
import module java.sql;    // contient java.sql.Date

Date d;                     // erreur : reference to Date is ambiguous
```

:::reveal Avant de lire la suite : comment dire au compilateur de quelle Date tu parles, sans renoncer aux deux imports de modules ?
Avec un import **simple** : `import java.util.Date;`. Il est plus précis, donc il l'emporte.
:::

L'ordre de priorité est fixe : import simple, puis import à la demande (`import java.util.*;`), puis import de module. Dans le code de production, les imports simples restent la norme : ils disent précisément ce dont la classe dépend.

### `var` (Java 10)

```java
var orders = new ArrayList<Order>();          // ArrayList<Order>
for (var entry : totals.entrySet()) { … }     // Map.Entry<String, Long>
try (var in = Files.newBufferedReader(path)) { … }
```

`var` n'est **pas** du typage dynamique : le compilateur fixe le type une fois pour toutes à partir de l'initialiseur, exactement comme `:=` en Go. Le `.class` produit est identique à celui où tu aurais écrit le type.

Il ne marche que pour les variables locales (et les variables de `for`, de `try`, les paramètres de lambda), jamais pour un champ, un paramètre de méthode ou un type de retour. Et il exige un initialiseur : `var x;` et `var x = null;` ne compilent pas.

À utiliser quand le type est évident à droite du `=` ; à éviter quand il cache une information utile (`var result = service.process(data);` : process renvoie quoi ?).

::checkpoint{id="c2"}

### Les blocs de texte (Java 15)

Règle à répéter : **le compilateur aligne tout sur la ligne la moins indentée, `"""` fermants compris**.

:::steps
```java
String json = """
    {
      "user": "%s",
      "unread": %d
    }
    """.formatted(user, unread);
```
--- 1: Les `"""` ouvrants doivent finir la ligne : le contenu commence à la ligne suivante.
--- 2,5: Ces lignes ont 4 espaces d'indentation, le minimum : elles se retrouvent collées à gauche dans le résultat.
--- 3-4: Elles ont 2 espaces de plus que le minimum : ces 2 espaces sont conservés. Les guillemets ne sont pas échappés.
--- 6: Les `"""` fermants comptent dans le calcul. Plus à gauche, ils ajouteraient de l'indentation à chaque ligne ; sur leur propre ligne, ils laissent un `\n` final.
--- 6: `.formatted(...)` remplace `%s` et `%d` à l'exécution, comme `String.format`.
:::

L'*espace accessoire* (cette indentation commune) disparaît, le reste est gardé. Les guillemets n'ont pas besoin d'être échappés. Deux échappements nouveaux : `\` en fin de ligne (pas de saut de ligne à cet endroit) et `\s` (un espace qui ne sera pas supprimé).

::checkpoint{id="c3"}

## Sous le capot

**Ce que javac fait d'un fichier compact.** Il génère une classe `final` dans le paquetage sans nom, qui étend `Object`, avec un constructeur par défaut. Son nom dépend de l'implémentation (OpenJDK prend le nom du fichier) et ne doit apparaître dans aucun code : on ne peut pas écrire `new Tally()` depuis une autre classe. Le fichier `.class` produit est ordinaire : la JVM ne sait même pas qu'il venait d'un fichier compact.

**Comment le lanceur choisit `main`.** D'abord une méthode `main(String[])`, déclarée ou héritée ; sinon une méthode `main()` sans paramètre ; sinon une erreur. Si la méthode choisie est `static`, il l'appelle directement. Sinon, il instancie la classe avec son constructeur sans argument (qui ne doit pas être privé), puis appelle `main` sur l'objet. Conséquence prévisible : une classe qui a à la fois `main(String[])` et `main()` lancera toujours la première.

> **Sous le capot :** `IO.println` n'a rien de spécial : c'est une méthode statique d'une classe de `java.lang`, qui écrit sur `System.out`. Elle est visible sans import pour la même raison que `String`.

**Le lanceur de source.** `java Tally.java` compile le fichier **en mémoire**, charge les classes dans un chargeur dédié et lance `main` : aucun `.class` n'est écrit. Depuis Java 22 (JEP 458), si le programme utilise une classe qui n'est pas dans le fichier, le lanceur cherche le `.java` correspondant dans le même dossier et le compile à la volée. On peut donc garder un petit outil en plusieurs fichiers sans outil de build.

**Un bloc de texte ne coûte rien à l'exécution.** Le retrait de l'indentation, la normalisation des fins de ligne (toujours `\n`, même si le fichier source est en CRLF) et la suppression des espaces de fin de ligne se font **à la compilation**. Le résultat est une constante dans la table des constantes du `.class`, comme `"abc"`. Seul `.formatted(…)` travaille à l'exécution.

## Pièges fréquents

- **`var` avec l'opérateur diamant** : `var list = new ArrayList<>();` infère `ArrayList<Object>`. On peut alors y mettre n'importe quoi, et le compilateur ne te protège plus.
- **`var` sur un littéral** : `var big = 3_000_000_000;` ne compile pas (un `int` déborde) ; il faut `3_000_000_000L`. Et `var ratio = 1;` donne un `int`, pas un `double`.
- **Les `"""` fermants mal placés** : ils font partie du calcul de l'indentation commune. Les placer au niveau du texte ou plus à droite ne change rien ; plus à gauche, chaque ligne gagne autant d'espaces.
- **Oublier que `readln()` renvoie `null` en fin d'entrée** : une boucle `while (true)` qui appelle `line.strip()` finit en `NullPointerException`.
- **Un fichier compact importé par d'autres classes** : impossible, il n'a pas de nom utilisable. C'est le signal qu'il est temps de le transformer en classe.
- **`import module` dans du code de production** : les collisions apparaissent le jour où l'on ajoute un module. Garde-le pour les scripts et les prototypes.

## À retenir

- Java 25 : un fichier sans classe, `void main()`, `IO.println` et `IO.readln` suffisent pour un outil ; tout `java.base` est importé.
- Pour le faire grandir : une déclaration de classe et `import module java.base;` (ou des imports simples). Le corps ne bouge pas.
- `var` : inférence à la compilation, locale seulement, à réserver aux types évidents.
- Bloc de texte : indentation commune retirée à la compilation, délimiteur fermant compris ; `.formatted()` pour les valeurs.
- `java Fichier.java` compile en mémoire et trouve les autres `.java` du dossier.

> **Sources :** JEP 512 (fichiers compacts et méthodes main d'instance, Java 25), JEP 511 (import de modules, Java 25), JEP 458 (lanceur multi-fichiers, Java 22), JEP 286 (`var`, Java 10), JEP 378 (blocs de texte, Java 15). Principes de clarté et de simplicité : *Effective Java*, 3e éd., introduction (pages 1 à 3).
