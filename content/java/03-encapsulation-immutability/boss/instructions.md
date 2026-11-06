## Contexte

Le moteur de workflow garde l'historique de chaque exécution : à chaque étape, l'état (une pile d'appels et une file de tâches) est **conservé** pour pouvoir rejouer ou inspecter n'importe quel point du passé, depuis plusieurs threads. Copier une `ArrayDeque` à chaque étape a fait exploser la mémoire. Il faut des collections **persistantes** : chaque opération renvoie une nouvelle version, les anciennes restent valides, et les versions partagent tout ce qu'elles ont en commun.

Pas d'indices pour ce combat.

## L'API

```java
PStack<String> s0 = PStack.empty();
PStack<String> s1 = s0.push("a").push("b");   // [b, a] : le sommet d'abord
s1.peek();       // "b"
s1.pop();        // [a]   (s1 ne change pas)
s1.size();       // 2, en temps constant

PQueue<Integer> q = PQueue.<Integer>empty().enqueue(1).enqueue(2).enqueue(3);   // [1, 2, 3]
q.peek();        // 1
q.dequeue();     // [2, 3]   (q ne change pas)
```

## Le contrat

**Les deux classes**
- immuables et sûres entre threads sans aucune synchronisation ; impossible à étendre ; aucun constructeur public ;
- `empty()` renvoie toujours **la même instance** (une par classe, quel que soit le type d'élément) ;
- `null` refusé (`NullPointerException`) ; `peek`, `pop`, `dequeue` sur une collection vide : `NoSuchElementException` ;
- `size()` en temps constant ; `isEmpty()` ;
- `Iterable` : `PStack` du sommet vers le fond, `PQueue` dans l'ordre de sortie ;
- `equals` : même classe, mêmes éléments dans le même ordre d'itération, **quelle que soit l'histoire** qui a produit chaque version ; `hashCode` calculé comme celui d'une `List` de ces éléments ; `toString` comme celui d'une `List` (`[b, a]`).

**`PStack`**
- `push` crée un seul nœud et partage tout le reste : `s.push(x).pop() == s` ;
- `reverse()` renvoie une nouvelle pile inversée.

**`PQueue`**
- `enqueue`, `peek`, `dequeue` : temps constant **amorti**, en usage linéaire (chaque version sert une fois) ;
- 200 000 `enqueue` puis 200 000 `dequeue` doivent prendre bien moins d'une seconde.

**Robustesse**
- `equals`, `hashCode`, `toString` et l'itération doivent fonctionner sur des collections de plusieurs centaines de milliers d'éléments.
