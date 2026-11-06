## Ordo

Au fil du cours, tu construis **Ordo**, une bibliothèque de carnet d'ordres : des acheteurs et des vendeurs déposent des ordres, un moteur les fait correspondre. Ce premier jalon pose trois briques. `Currency`, `Side` et `Sink` sont fournis.

## M1 — `Money`

Un montant ne se stocke **jamais** en `double` (`0.1 + 0.2 != 0.3`). `Money` garde un `long` d'**unités mineures** (centimes pour EUR et USD ; JPY n'en a pas : `Currency.digits()` donne le nombre de décimales).

```java
Money.ofMinor(1250, Currency.EUR)      // 12.50 EUR
Money.parse("12.5", Currency.EUR)      // 12.50 EUR
Money.parse("1500", Currency.JPY)      // 1500 JPY
Money.parse("12.345", Currency.EUR)    // IllegalArgumentException : trop de décimales
Money.zero(Currency.USD) == Money.zero(Currency.USD)   // true
```

- Aucun constructeur public. `parse` accepte un signe `-` optionnel, des chiffres, et au plus `digits()` décimales (`"12."`, `"abc"`, `""` : `IllegalArgumentException` avec le texte refusé dans le message).
- `zero(c)` renvoie **toujours la même instance** pour une devise donnée, y compris quand un calcul tombe sur zéro (`plus`, `ofMinor(0, …)`, `parse("0")`).
- `plus(Money)` : même devise obligatoire (`IllegalArgumentException`), dépassement de `long` : `ArithmeticException`.
- `isPositive()`, `minorUnits()`, `currency()`, et `toString()` au format `12.50 EUR`, `-0.05 USD`, `1500 JPY`.

## M2 — `Order`

```java
Order o = new Order.Builder("ord-1", Side.BUY, "ACME")
        .quantity(10)
        .limit(Money.parse("12.50", Currency.EUR))   // sans limit() : ordre au marché
        .build();
```

- Obligatoires au constructeur du builder : `id`, `side`, `symbol` (non nuls ; `symbol` = 1 à 5 lettres majuscules, sinon `IllegalArgumentException` immédiate).
- `quantity(long)` refuse ≤ 0 tout de suite. Elle est obligatoire : un `build()` sans quantité lève `IllegalStateException`.
- `limit(Money)` refuse un prix non positif. `limit()` côté ordre renvoie un `Optional<Money>` ; `isMarket()` vaut `true` sans prix limite.
- `allOrNone()` (option) : l'ordre s'exécute en entier ou pas du tout. Invariant croisé au `build()` : un ordre **au marché** ne peut pas être `allOrNone` (`IllegalStateException`).
- `toString()` : `ord-1 BUY 10 ACME @ 12.50 EUR`, ou `ord-2 SELL 5 ACME @ MKT` pour un ordre au marché (suffixe ` AON` si `allOrNone`).

## M3 — `OrderJournal`

Chaque ordre accepté est journalisé. Écrire sur le disque à chaque ordre coûte cher : le journal **tamponne** et écrit par lots.

```java
try (OrderJournal journal = OrderJournal.open(sink, clock, 3)) {
    journal.record(o);   // 2026-11-05T12:00:00Z ord-1 BUY 10 ACME @ 12.50 EUR
}
```

- `open(Sink, Clock, capacity)` : aucun argument nul, `capacity ≥ 1`. L'horodatage vient de l'horloge injectée (`clock.instant()` au moment de `record`).
- `record` ajoute la ligne `"<instant> <order>"` au tampon. Quand le tampon atteint `capacity` lignes, il est écrit d'un coup avec `sink.write(List<String>)` puis vidé. `buffered()` donne le nombre de lignes en attente.
- `flush()` écrit ce qui reste (rien si le tampon est vide : pas d'appel à `write`).
- **Pas de rétention** : après un vidage, le journal ne garde aucune référence aux lignes écrites.
- Si `sink.write` échoue, le tampon est **conservé** (on ne perd pas d'ordres) et l'exception remonte.
- `close()` : `flush()` puis `sink.close()`, le support étant fermé **même si** le vidage échoue ; dans ce cas l'erreur de vidage reste principale et celle de fermeture lui est attachée. Idempotent. Après fermeture, `record` lève `IllegalStateException`.
