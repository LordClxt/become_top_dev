---
id: java-ch00-l01
title: "Du script au programme : fichiers compacts, var et blocs de texte"
source: { chapter: 1, pages: "1-3", url: "https://openjdk.org/jeps/512" }
duration_min: 30
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
visuals: []
labs: [java-ch00-l01-lab-warmup-payload, java-ch00-l01-lab-tally]
extra: true
xp: 30
---

## Pourquoi c'est important

Vendredi, 17 h. On te demande de totaliser un export de caisse : quelques centaines de lignes `article;quantité;prix`. En Go, tu écris un `main.go` de vingt lignes et tu lances `go run`. En Java « de 2014 », il te fallait d'abord une classe publique dont le nom correspond au fichier, un `public static void main(String[] args)`, trois imports pour lire l'entrée standard, une compilation, puis une exécution. Résultat : beaucoup d'équipes écrivaient ces outils en Python ou en Bash… et les réécrivaient en Java le jour où ils devenaient importants, en recopiant les bugs.

Depuis Java 25, le même outil tient dans un fichier sans aucune cérémonie, et il **grandit** en vraie classe sans être réécrit. Ce module est un tour accéléré du Java que tu écriras dans ce cours : le livre de Bloch s'arrête à Java 9, tout ce qui suit est marqué *extra*.

## Le concept

### Un fichier compact

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

- **pas de classe** : un fichier qui déclare directement des champs et des méthodes est un *fichier source compact* ;
- **`main` d'instance** : ni `public`, ni `static`, ni `String[] args` obligatoires ;
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

### Faire grandir le programme

Le jour où l'outil devient du code d'équipe, tu l'entoures d'une classe et tu ajoutes l'import que le fichier compact faisait pour toi. **Le corps ne change pas** :

```java
import module java.base;

final class Tally {
    final Map<String, Long> totals = new LinkedHashMap<>();
    void add(String item, long cents) { totals.merge(item, cents, Long::sum); }
    void main() { /* identique */ }
}
```

C'est l'idée directrice de la fonctionnalité : une rampe d'accès, pas un dialecte. Un fichier compact n'a ni `package`, ni nom utilisable : dès que d'autres classes doivent l'appeler, c'est une classe normale qu'il te faut.

### `import module`

`import module java.sql;` importe d'un coup les types publics de **tous** les paquetages exportés par le module (`java.sql`, `javax.sql`…), plus ceux des modules qu'il rend transitivement lisibles. Pratique pour un script, mais attention aux collisions :

```java
import module java.base;   // contient java.util.Date
import module java.sql;    // contient java.sql.Date

Date d;                     // erreur : reference to Date is ambiguous
```

La correction : un import **simple** (`import java.util.Date;`). L'ordre de priorité est fixe : import simple, puis import à la demande (`import java.util.*;`), puis import de module. Dans le code de production, les imports simples restent la norme : ils disent précisément ce dont la classe dépend.

### `var` (Java 10)

```java
var orders = new ArrayList<Order>();          // ArrayList<Order>
for (var entry : totals.entrySet()) { … }     // Map.Entry<String, Long>
try (var in = Files.newBufferedReader(path)) { … }
```

`var` n'est **pas** du typage dynamique : le compilateur fixe le type une fois pour toutes à partir de l'initialiseur, exactement comme `:=` en Go. Il ne marche que pour les variables locales (et les variables de `for`, de `try`, les paramètres de lambda), jamais pour un champ, un paramètre de méthode ou un type de retour. Et il exige un initialiseur : `var x;` et `var x = null;` ne compilent pas.

À utiliser quand le type est évident à droite du `=` ; à éviter quand il cache une information utile (`var result = service.process(data);` : process renvoie quoi ?).

### Les blocs de texte (Java 15)

```java
String json = """
    {
      "user": "%s",
      "unread": %d
    }
    """.formatted(user, unread);
```

Le contenu commence à la ligne qui suit les `"""` ouvrants. Le compilateur retire l'**indentation commune** à toutes les lignes, en comptant la ligne du délimiteur fermant : déplacer les `"""` fermants vers la gauche ajoute de l'indentation au résultat. Les guillemets n'ont pas besoin d'être échappés. Deux échappements nouveaux : `\` en fin de ligne (pas de saut de ligne à cet endroit) et `\s` (un espace qui ne sera pas supprimé).

## Sous le capot

**Ce que javac fait d'un fichier compact.** Il génère une classe `final` dans le paquetage sans nom, qui étend `Object`, avec un constructeur par défaut. Son nom dépend de l'implémentation (OpenJDK prend le nom du fichier) et ne doit apparaître dans aucun code : on ne peut pas écrire `new Tally()` depuis une autre classe. Le fichier `.class` produit est ordinaire : la JVM ne sait même pas qu'il venait d'un fichier compact.

**Comment le lanceur choisit `main`.** D'abord une méthode `main(String[])`, déclarée ou héritée ; sinon une méthode `main()` sans paramètre ; sinon une erreur. Si la méthode choisie est `static`, il l'appelle directement. Sinon, il instancie la classe avec son constructeur sans argument (qui ne doit pas être privé), puis appelle `main` sur l'objet. Conséquence prévisible : une classe qui a à la fois `main(String[])` et `main()` lancera toujours la première.

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
