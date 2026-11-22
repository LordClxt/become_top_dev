---
id: java-ch04-l01
title: "La composition plutôt que l'héritage"
source: { chapter: 4, pages: "87-92" }
duration_min: 35
concepts:
  - id: java-inheritance-breaks-encapsulation
    label: "L'héritage d'implémentation viole l'encapsulation : la sous-classe dépend de détails de la super-classe (auto-utilisation, nouvelles méthodes) qui peuvent changer d'une version à l'autre"
  - id: java-self-use
    label: "Auto-utilisation : une méthode de la super-classe en appelle une autre (addAll appelle add) ; une redéfinition des deux compte deux fois"
  - id: java-composition-forwarding
    label: "Composition et transfert : un champ privé vers l'objet existant, des méthodes qui lui transmettent chaque appel ; une classe de transfert réutilisable par interface"
  - id: java-decorator-wrapper
    label: "Classe enveloppe (patron Décorateur) : elle transforme un Set en un autre Set, fonctionne avec toute implémentation, et ne souffre que du problème SELF (les rappels lui échappent)"
  - id: java-is-a-test
    label: "Hériter seulement si chaque B est vraiment un A ; sinon B contient un A (Stack n'est pas un Vector, Properties n'est pas une Hashtable)"
glossary:
  - term: "héritage d'implémentation"
    definition: "Une classe qui en étend une autre (extends) et hérite de son code. Différent de l'héritage d'interface (implements), qui n'hérite que d'un contrat."
  - term: "auto-utilisation (self-use)"
    definition: "Une méthode d'une classe qui en appelle une autre de la même classe, redéfinissable par une sous-classe."
  - term: "composition"
    definition: "Une classe qui contient une instance d'une autre comme composant privé, au lieu d'en hériter."
  - term: "transfert (forwarding)"
    definition: "Méthode qui transmet l'appel à l'objet contenu et renvoie son résultat."
  - term: "problème SELF"
    definition: "L'objet enveloppé ne connaît pas son enveloppe : quand il se passe lui-même (this) à quelqu'un, les rappels contournent l'enveloppe."
visuals: [java-ch04-self-use-trace]
labs: [java-ch04-l01-lab-counting-set]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Deux façons de compter les insertions dans un ensemble : en héritant de `HashSet`, ou en enveloppant un `Set`. On ajoute trois éléments avec `addAll`. Qu'affiche le programme ?"
    code: |
      import java.util.*;

      public class Main {
          static class InstrumentedHashSet<E> extends HashSet<E> {
              int addCount;
              @Override public boolean add(E e) { addCount++; return super.add(e); }
              @Override public boolean addAll(Collection<? extends E> c) { addCount += c.size(); return super.addAll(c); }
          }

          static class CountingSet<E> extends AbstractSet<E> {
              private final Set<E> inner;
              int addCount;
              CountingSet(Set<E> inner) { this.inner = inner; }
              @Override public boolean add(E e) { addCount++; return inner.add(e); }
              @Override public boolean addAll(Collection<? extends E> c) { addCount += c.size(); return inner.addAll(c); }
              @Override public Iterator<E> iterator() { return inner.iterator(); }
              @Override public int size() { return inner.size(); }
          }

          public static void main(String[] args) {
              var inherited = new InstrumentedHashSet<String>();
              inherited.addAll(List.of("Snap", "Crackle", "Pop"));
              var wrapped = new CountingSet<String>(new HashSet<>());
              wrapped.addAll(List.of("Snap", "Crackle", "Pop"));
              System.out.println(inherited.addCount + " " + wrapped.addCount);
          }
      }
    answer: "6 3"
    explanation: "Dans la version héritée, super.addAll de HashSet (en fait d'AbstractCollection) appelle add pour chaque élément : le add redéfini compte une seconde fois, 3 + 3. Dans l'enveloppe, inner.addAll appelle le add du HashSet contenu, pas celui de l'enveloppe : 3. Toujours vrai sur le JDK 25."
    concept: java-self-use
  - id: c2
    type: code-output
    prompt: "`Properties` hérite de `Hashtable<Object, Object>`. Qu'affiche le programme ?"
    code: |
      import java.util.Properties;

      public class Main {
          public static void main(String[] args) {
              Properties defaults = new Properties();
              defaults.setProperty("timeout", "30");
              Properties config = new Properties(defaults);
              config.put("retries", 3);
              System.out.println(config.getProperty("timeout") + " " + config.get("timeout") + " " + config.getProperty("retries"));
          }
      }
    answer: "30 null null"
    explanation: "getProperty consulte les valeurs par défaut, get (hérité de Hashtable) ne les connaît pas : deux réponses pour la même clé. Et put, hérité lui aussi, accepte un Integer, alors que getProperty ne renvoie que des chaînes : la valeur 3 devient invisible. Une Properties n'est pas une Hashtable ; l'héritage a exposé une API qui casse ses invariants."
    concept: java-is-a-test
  - id: c3
    type: single
    prompt: "Un `Button` enveloppe un `Widget` (composition) pour journaliser ses clics. Le `Widget` s'enregistre lui-même auprès du gestionnaire d'événements avec `bus.register(this)`. Que se passe-t-il quand un événement arrive ?"
    choices:
      - "L'enveloppe le voit et le journalise, comme pour un appel direct"
      - "Le gestionnaire appelle le Widget directement : l'enveloppe est contournée, aucun journal"
      - "Une exception, car this désigne l'enveloppe"
      - "Le gestionnaire appelle les deux"
    answer: 1
    explanation: "C'est le problème SELF : l'objet enveloppé ne connaît pas son enveloppe. En se passant lui-même (this) à un cadre de rappels, il donne sa propre référence, et les rappels lui arrivent sans passer par l'enveloppe. Les classes enveloppes conviennent mal aux cadres à base de rappels."
    concept: java-decorator-wrapper
---

## Pourquoi c'est important

Ordo doit mesurer la charge du moteur : combien d'ordres ont été **soumis** au carnet depuis le démarrage (pas combien y restent). Un développeur étend `HashSet`, redéfinit `add` et `addAll` pour incrémenter un compteur, et livre. Les chiffres du tableau de bord doublent dès qu'un lot arrive par `addAll`. Pire : la correction qui marche aujourd'hui (« je ne redéfinis plus `addAll` ») cassera le jour où le JDK changera la façon dont `HashSet` est écrit.

En Go, la question ne se pose pas : il n'y a pas d'héritage d'implémentation. Tu **embarques** une structure dans une autre, et la méthode promue reste celle de la structure embarquée : un `AddAll` embarqué n'appelle jamais ton `Add` à toi. Java, lui, a l'héritage, et la liaison dynamique fait que le code de la super-classe appelle **tes** redéfinitions. C'est la source du problème, et la raison de cette règle de Bloch.

## Quand l'héritage casse l'encapsulation

Le mot « héritage » désigne ici l'**héritage d'implémentation** (`extends` d'une classe). Implémenter une interface ne pose aucun de ces problèmes.

Hériter d'une classe est sûr dans deux cas : à l'intérieur d'un même paquetage, quand les deux classes sont écrites par la même équipe ; ou quand la super-classe a été **conçue et documentée** pour l'extension (leçon 2). Hériter d'une classe concrète ordinaire, écrite par d'autres, est dangereux, pour deux raisons.

**1. L'auto-utilisation.** `HashSet.addAll` appelle `add` pour chaque élément. C'est un détail d'implémentation, jamais documenté. La sous-classe qui redéfinit les deux compte donc chaque élément deux fois.

::checkpoint{id="c1"}

« Il suffit de ne pas redéfinir `addAll` » : la classe marche, mais seulement **parce que** `addAll` passe par `add`. Une autre implémentation (ou une prochaine version) peut ne pas le faire. Réécrire `addAll` élément par élément marche aussi, au prix de réimplémenter la super-classe, ce qui est parfois impossible sans ses champs privés.

**2. Les nouvelles méthodes.** Une sous-classe qui vérifie chaque élément ajouté (par exemple « seulement des ordres validés ») redéfinit toutes les méthodes d'ajout… existantes. Le jour où la super-classe gagne une nouvelle méthode d'ajout, la vérification a un trou. Ce n'est pas théorique : plusieurs failles de sécurité de ce type ont dû être corrigées quand `Hashtable` et `Vector` ont rejoint les collections de Java 1.2.

> **Sous le capot :** pourquoi `super.addAll` rappelle-t-il **ton** `add` ? `HashSet` hérite `addAll` d'`AbstractCollection`, qui fait `for (E e : c) if (add(e)) modified = true;`. Cet appel `add(e)` est un appel virtuel sur `this` : la JVM (instruction `invokevirtual`) cherche la méthode dans la classe **réelle** de l'objet, ta sous-classe. Le code de la super-classe ne peut pas savoir qu'il appelle du code écrit après lui. Le JDK 25 se comporte exactement comme celui de 2017.

## Composer et transférer

La solution : ne pas étendre la classe existante, mais la **contenir**. Un champ privé vers un `Set`, et chaque méthode de l'interface qui transmet l'appel à ce champ. C'est la **composition**, et ces méthodes sont des méthodes de **transfert** (*forwarding*).

Bloch découpe en deux pièces. Une classe de transfert réutilisable, écrite une fois par interface :

```java title="ForwardingSet.java"
public class ForwardingSet<E> implements Set<E> {
    private final Set<E> s;
    public ForwardingSet(Set<E> s) { this.s = s; }

    public boolean add(E e)                            { return s.add(e); }
    public boolean addAll(Collection<? extends E> c)   { return s.addAll(c); }
    public boolean contains(Object o)                  { return s.contains(o); }
    public int size()                                  { return s.size(); }
    public Iterator<E> iterator()                      { return s.iterator(); }
    // … une ligne par méthode de Set, plus equals, hashCode et toString
}
```

Puis la classe qui ajoute le comportement, en n'écrivant que ce qui change :

```java title="InstrumentedSet.java"
public class InstrumentedSet<E> extends ForwardingSet<E> {
    private int addCount = 0;
    public InstrumentedSet(Set<E> s) { super(s); }

    @Override public boolean add(E e) { addCount++; return super.add(e); }
    @Override public boolean addAll(Collection<? extends E> c) { addCount += c.size(); return super.addAll(c); }
    public int addCount() { return addCount; }
}
```

Hériter de `ForwardingSet` est sûr : c'est **notre** classe, dans notre paquetage, et elle ne s'appelle jamais elle-même. `super.addAll` transmet au `Set` contenu, dont l'`add` interne n'est pas le nôtre.

::visual{id="java-ch04-self-use-trace"}

Le résultat est plus solide **et** plus puissant. `InstrumentedSet` transforme un `Set` en un autre `Set` : il fonctionne avec n'importe quelle implémentation et n'importe quel constructeur, et peut même instrumenter un ensemble déjà en service, le temps d'une méthode.

```java
Set<Instant> times = new InstrumentedSet<>(new TreeSet<>(comparator));
Set<Order> book = new InstrumentedSet<>(new HashSet<>(1_024));
```

C'est le patron **Décorateur** : l'enveloppe « décore » l'ensemble d'un comportement de plus. On parle souvent de délégation, à tort : il n'y a délégation au sens strict que si l'enveloppe se passe elle-même à l'objet enveloppé.

> **Au-delà du livre :** depuis Java 8, une classe de transfert peut hériter de la classe abstraite `AbstractSet` (ou `AbstractList`, `AbstractMap`) pour obtenir `equals`, `hashCode` et `toString` corrects sans les écrire ; il reste à transférer `iterator`, `size` et les méthodes qu'on veut garder rapides (`contains`, `add`). Guava fournit des classes `Forwarding*` pour toutes les interfaces de collections.

## Les limites de l'enveloppe

Les inconvénients sont rares. Le transfert coûte un appel de méthode, que le JIT élimine presque toujours par *inlining* ; l'objet enveloppe coûte quelques octets. Le vrai problème est le **problème SELF** : l'objet enveloppé ne connaît pas son enveloppe. S'il se passe lui-même (`this`) à quelqu'un (un gestionnaire d'événements, un planificateur), les rappels lui arrivent directement, sans passer par l'enveloppe.

::checkpoint{id="c3"}

## Est-ce vraiment un « est-un » ?

L'héritage reste le bon outil quand la sous-classe est **réellement un sous-type** : chaque `B` est-il vraiment un `A` ? Si la réponse n'est pas un oui franc, `B` doit **contenir** un `A` et exposer sa propre API. `A` n'est alors qu'un détail d'implémentation de `B`.

Le JDK a deux erreurs célèbres. Une pile n'est pas un vecteur, et pourtant `Stack extends Vector` : n'importe qui peut insérer au milieu d'une pile. Une liste de propriétés n'est pas une table de hachage, et pourtant `Properties extends Hashtable` :

::checkpoint{id="c2"}

L'héritage a exposé `get` et `put`, qui ignorent les valeurs par défaut et acceptent n'importe quel type. Le jour où on s'en est aperçu, des clients dépendaient déjà des clés non textuelles : impossible de corriger. Hériter, c'est aussi **hériter des défauts de l'API** de la super-classe, pour toujours ; composer permet d'en écrire une meilleure.

## Pièges fréquents

- **Étendre une collection du JDK pour « ajouter un petit comportement »** : compteur, validation, journal. Écris une enveloppe.
- **« Corriger » le double compte en retirant la redéfinition de `addAll`** : le code dépend désormais d'un détail non documenté de la super-classe.
- **Valider les ajouts en redéfinissant les méthodes d'ajout d'une sous-classe** : la prochaine méthode d'ajout de la super-classe passera à côté.
- **Envelopper un objet qui s'enregistre lui-même comme rappel** : les rappels contournent l'enveloppe.
- **Hériter pour réutiliser du code** alors que la relation n'est pas « est-un » : l'API de la super-classe devient la tienne, défauts compris.

## À retenir

- L'héritage d'implémentation viole l'encapsulation : la sous-classe dépend de l'auto-utilisation et des futures méthodes de la super-classe.
- Préfère la composition et le transfert : un champ privé, une classe de transfert réutilisable par interface, puis une enveloppe qui ne redéfinit que ce qui change.
- Une enveloppe (Décorateur) fonctionne avec toute implémentation de l'interface ; sa seule vraie limite est le problème SELF.
- N'hérite que si chaque `B` est vraiment un `A`, et que la super-classe est conçue pour l'extension (leçon 2) ou dans ton paquetage.

> **Source :** *Effective Java*, 3e éd., item 18 (pages 87 à 92).
