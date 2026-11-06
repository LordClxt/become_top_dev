## Hint 1
`Stack` : une ligne suffit après `super.clone()`, il existe un idiome pour copier un tableau. `ChainedMap` : après avoir cloné le tableau de compartiments, il faut remplacer chaque tête de chaîne par la tête d'une **copie** de la chaîne.

## Hint 2
Pour copier une chaîne sans récursion : crée la nouvelle tête, puis avance un pointeur `p` sur la copie en remplaçant `p.next` par une nouvelle `Entry` à chaque pas. Pour `Schedule`, une `EnumMap<DayOfWeek, List<String>>` et `new ArrayList<>(liste)` par jour.

## Hint 3
```
Entry deepCopy() {
    Entry head = new Entry(key, value, next);
    for (Entry p = head; p.next != null; p = p.next)
        p.next = new Entry(p.next.key, p.next.value, p.next.next);
    return head;
}
```
Dans `clone()` : `result.buckets = new Entry[buckets.length];` puis `result.buckets[i] = buckets[i] == null ? null : buckets[i].deepCopy();`. Le constructeur de copie de `Schedule` peut déléguer à `from(other.team, other.shifts)`.
