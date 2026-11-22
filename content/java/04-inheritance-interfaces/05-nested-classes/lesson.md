---
id: java-ch04-l05
title: "Classes imbriquées : statiques d'abord, et une classe par fichier"
source: { chapter: 4, pages: "112-116" }
duration_min: 30
concepts:
  - id: java-nested-kinds
    label: "Quatre sortes de classes imbriquées : membre statique, membre non statique (interne), anonyme, locale ; seule la première n'est pas liée à une instance englobante"
  - id: java-hidden-outer-reference
    label: "Une classe interne qui utilise l'instance englobante en garde une référence cachée (this$0) : coût mémoire, et fuite quand elle survit à l'objet englobant ; depuis le JDK 18, javac l'omet si la classe ne s'en sert pas"
  - id: java-static-member-default
    label: "Règle : une classe membre qui n'a pas besoin de l'instance englobante est static ; la classe interne se réserve aux vues et adaptateurs (keySet, itérateurs)"
  - id: java-one-top-level-per-file
    label: "Une seule classe de premier niveau par fichier source : sinon le programme dépend de l'ordre des fichiers passés au compilateur ; préférer des classes membres statiques"
glossary:
  - term: "classe membre statique"
    definition: "Classe déclarée static dans une autre : une classe ordinaire, rangée dans la première, qui peut accéder à ses membres privés."
  - term: "classe interne"
    definition: "Classe membre non statique : chaque instance est liée à une instance de la classe englobante, accessible par Englobante.this."
  - term: "classe anonyme"
    definition: "Classe sans nom, déclarée et instanciée en une expression ; dans un contexte non statique, elle peut capturer l'instance englobante."
  - term: "classe locale"
    definition: "Classe déclarée dans un bloc (une méthode), visible seulement dans ce bloc."
  - term: "fuite mémoire"
    definition: "En Java : un objet qui n'est plus utile reste atteignable, donc jamais récupéré par le ramasse-miettes."
visuals: [java-ch04-hidden-reference]
labs: [java-ch04-l05-lab-leaking-levels]
extra: false
xp: 25
checkpoints:
  - id: c1
    type: code-output
    prompt: "Un carnet d'ordres de 8 Mo renvoie ses niveaux de prix, une fois comme classe interne, une fois comme classe statique. On garde les niveaux et on oublie le carnet. Qu'affiche le programme ?"
    code: |
      import java.lang.ref.WeakReference;
      import java.util.List;

      public class Main {
          static final class Book {
              private final long[] orders = new long[1_000_000];      // ~8 Mo
              private final String currency = new String("EUR");

              /** Classe interne (non statique) : elle lit currency. */
              class Level {
                  final long price;
                  Level(long price) { this.price = price; }
                  @Override public String toString() { return price + " " + currency; }
              }

              /** Classe imbriquée statique : elle reçoit ce dont elle a besoin. */
              static final class StaticLevel {
                  final long price;
                  final String currency;
                  StaticLevel(long price, String currency) { this.price = price; this.currency = currency; }
              }

              List<Level> levels() { return List.of(new Level(100), new Level(101)); }
              List<StaticLevel> staticLevels() { return List.of(new StaticLevel(100, currency)); }
          }

          static boolean freed(WeakReference<?> ref) throws InterruptedException {
              for (int i = 0; i < 10 && ref.get() != null; i++) { System.gc(); Thread.sleep(10); }
              return ref.get() == null;
          }

          public static void main(String[] args) throws Exception {
              Book a = new Book();
              List<Book.Level> kept = a.levels();
              WeakReference<Book> refA = new WeakReference<>(a);
              a = null;

              Book b = new Book();
              List<Book.StaticLevel> keptStatic = b.staticLevels();
              WeakReference<Book> refB = new WeakReference<>(b);
              b = null;

              System.out.println("interne : " + (freed(refA) ? "libéré" : "retenu") + ", statique : " + (freed(refB) ? "libéré" : "retenu"));
              System.out.println(kept.size() + keptStatic.size());
          }
      }
    answer: "interne : retenu, statique : libéré\n3"
    explanation: "Chaque Level interne garde une référence cachée vers son Book (il lit currency) : tant que la liste kept vit, les 8 Mo du carnet restent en mémoire. StaticLevel a copié ce dont il avait besoin : le carnet est récupéré. Les deux listes sont gardées (2 + 1 éléments) pour que la comparaison soit honnête."
    concept: java-hidden-outer-reference
  - id: c2
    type: single
    prompt: "`Utensil.java` et `Dessert.java` définissent **tous deux** les classes de premier niveau `Utensil` et `Dessert`, avec des valeurs différentes. Que se passe-t-il ?"
    choices:
      - "Le compilateur refuse toujours, quel que soit l'ordre des fichiers"
      - "Selon les fichiers et leur ordre sur la ligne de commande, la compilation échoue (classe en double) ou réussit avec l'une ou l'autre version : le comportement dépend de l'ordre de compilation"
      - "Java choisit la version du fichier qui porte le nom de la classe"
      - "Les deux versions coexistent"
    answer: 1
    explanation: "javac Main.java Dessert.java échoue : Utensil et Dessert sont définies deux fois. javac Main.java Utensil.java réussit avec une version, javac Dessert.java Main.java avec l'autre. Un programme dont le sens dépend de l'ordre de compilation est inacceptable : une classe de premier niveau par fichier, ou des classes membres statiques."
    concept: java-one-top-level-per-file
  - id: c3
    type: single
    prompt: "`HashMap.Node`, qui représente une entrée de la table, est une classe membre **statique**. Pourquoi pas une classe interne ?"
    choices:
      - "Pour qu'elle soit publique"
      - "Une entrée n'a pas besoin de sa map : une référence cachée par entrée coûterait de la mémoire pour rien, sur des millions d'entrées"
      - "Parce que les classes internes ne peuvent pas être génériques"
      - "Pour pouvoir la sérialiser"
    answer: 1
    explanation: "Une classe interne paie une référence vers l'instance englobante, et la construction exige cette instance. Une entrée ne s'en sert pas : static, et chaque entrée économise une référence. La règle : static, sauf si la classe a vraiment besoin de l'instance englobante."
    concept: java-static-member-default
---

## Pourquoi c'est important

Le service de diffusion d'Ordo garde en cache les derniers niveaux de prix envoyés à chaque client. Le carnet d'ordres, lui, est remplacé toutes les secondes. Sur le serveur, la mémoire monte de 8 Mo par seconde, jusqu'au `OutOfMemoryError`. L'analyse du tas (*heap dump*) montre des milliers de carnets « morts », retenus chacun par… quelques objets `Level` de 40 octets. Le coupable tient en un mot : il manque `static` devant `class Level`.

En Go, il n'y a pas de classes imbriquées : un type déclaré dans un fichier est indépendant, et une fermeture (*closure*) ne capture que les variables qu'elle utilise. Java a quatre sortes de classes imbriquées, et l'une d'elles capture **l'objet entier**.

## Quatre sortes de classes imbriquées

| Sorte | Liée à une instance englobante ? | Usage typique |
|---|---|---|
| **membre statique** | non | classe auxiliaire publique (`Map.Entry`, `Order.Builder`), composant privé (`HashMap.Node`) |
| **membre non statique** (classe interne) | **oui** | vue ou adaptateur sur l'objet englobant (`keySet()`, itérateurs) |
| **anonyme** | oui, dans un contexte non statique, si elle s'en sert | petit objet de fonction, aujourd'hui remplacé par une lambda (module 7) |
| **locale** | comme une anonyme | rare : une classe nommée utilisée dans une seule méthode |

Une classe membre statique est une classe ordinaire, simplement rangée dans une autre (avec accès à ses membres privés). Une classe **interne**, elle, a ses instances liées à une instance de la classe englobante : elle peut appeler ses méthodes, lire ses champs (`Book.this.currency`), et on ne peut pas la créer sans elle (`book.new Level(100)`).

## La référence cachée

Pour réaliser ce lien, le compilateur ajoute à la classe interne un champ caché vers l'instance englobante (`this$0`), et un paramètre caché à son constructeur. Deux conséquences :
- **de la mémoire** : une référence de plus par instance, et un objet de plus à construire avant ;
- **une fuite** : tant qu'une instance de la classe interne est atteignable, l'objet englobant **entier** l'est aussi, même s'il ne sert plus à rien.

::checkpoint{id="c1"}

::visual{id="java-ch04-hidden-reference"}

La règle de Bloch est donc simple : **si une classe membre n'a pas besoin d'accéder à l'instance englobante, déclare-la toujours `static`.** Elle reçoit en paramètre ce dont elle a besoin. Le JDK l'applique partout : `HashMap.Node`, `Order.Builder` (module 1), les entrées de toutes les maps.

::checkpoint{id="c3"}

Les classes internes ont un vrai usage : les **vues** et **adaptateurs**, qui doivent lire l'objet englobant à chaque appel. `HashMap.keySet()` renvoie une classe interne qui lit la map : supprimer une clé de la vue la supprime de la map. Là, la référence est voulue.

> **Sous le capot :** depuis le JDK 18 (JDK-8271623), javac n'ajoute plus `this$0` à une classe interne ou anonyme qui ne se sert **pas** de l'instance englobante ; elle garde seulement l'obligation d'être créée à partir d'elle. La règle « static par défaut » reste valable : la référence apparaît dès que la classe lit un champ ou appelle une méthode de l'objet englobant, et une constante de compilation (`final String X = "EUR"`) ne compte pas, car elle est recopiée. Les **lambdas** suivent la même logique : une lambda qui lit un champ capture `this`, donc l'objet entier. Pour diagnostiquer une fuite, un *heap dump* (`jcmd <pid> GC.heap_dump`) et le chemin vers les racines du ramasse-miettes montrent exactement quel `this$0` retient quoi.

## Anonymes et locales

Une classe anonyme se déclare et s'instancie en une seule expression. Elle ne peut pas implémenter deux interfaces, ne peut pas être nommée dans un `instanceof`, et rend le code moins lisible au-delà de quelques lignes. Depuis Java 8, les **lambdas** les remplacent pour les objets de fonction (module 7) ; il reste les cas où il faut un état, plusieurs méthodes ou une classe abstraite. Une classe **locale** est une classe nommée déclarée dans une méthode : rare, et soumise aux mêmes règles de capture.

## Une seule classe de premier niveau par fichier

Le compilateur Java accepte plusieurs classes de premier niveau dans un même fichier source. Bloch montre pourquoi il ne faut **jamais** le faire : si deux fichiers définissent les mêmes classes, le programme compilé dépend de l'ordre des fichiers sur la ligne de commande.

::checkpoint{id="c2"}

La solution : une classe de premier niveau par fichier. Si plusieurs petites classes vont ensemble, ce sont des **classes membres statiques** d'une classe englobante (et `private` si elles ne servent qu'à elle).

## Pièges fréquents

- **Oublier `static`** devant une classe membre qui ne lit pas l'instance englobante, surtout si ses instances survivent à l'objet englobant (cache, liste renvoyée, écouteur enregistré ailleurs).
- **Une classe anonyme ou une lambda enregistrée comme écouteur** qui lit un champ de son objet : l'écouteur retient tout l'objet tant qu'il n'est pas désinscrit.
- **Copier toute la classe englobante dans la classe statique** au lieu des seules données utiles.
- **Plusieurs classes de premier niveau dans un fichier**, même « provisoirement ».
- **Croire que javac supprime toujours la référence** : seulement si la classe ne s'en sert pas.

## À retenir

- Quatre sortes : membre statique, interne, anonyme, locale. Seule la statique n'est pas liée à une instance.
- Une classe interne qui utilise l'objet englobant le retient tout entier : mémoire et fuites. **Static par défaut**, interne seulement pour les vues et adaptateurs.
- Les lambdas qui lisent un champ capturent `this`, comme les classes anonymes.
- Une classe de premier niveau par fichier ; sinon, des classes membres statiques.

> **Source :** *Effective Java*, 3e éd., items 24 et 25 (pages 112 à 116) ; [JDK-8271623 : omettre la référence à l'instance englobante quand elle n'est pas utilisée](https://bugs.openjdk.org/browse/JDK-8271623).
