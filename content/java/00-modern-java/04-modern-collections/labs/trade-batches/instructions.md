## Contexte

Le service de règlement envoie les transactions (`Trade`, fourni) à la chambre de compensation. Elle impose des **paquets** dont le montant total (le *notionnel* : quantité × prix) ne dépasse pas une limite, et le contrôle des risques veut des indicateurs calculés **dans le stream**, sans le transformer en boucle.

```java
record Trade(String symbol, long qty, long priceCents) {
    long notional() { return qty * priceCents; }
}
```

## Ta mission

Dans `Batching.java` :

1. **`byNotional(long limitCents)`**, un gatherer qui regroupe les transactions **consécutives** en paquets (`List<Trade>` non modifiables) : on ajoute au paquet en cours tant que son notionnel total reste ≤ limite ; sinon on émet le paquet et on en commence un nouveau. Une transaction plus grosse que la limite forme un paquet à elle seule. Le dernier paquet est émis à la fin du flux. Une limite ≤ 0 lève `IllegalArgumentException`.
2. **`untilExposure(long capCents)`**, un gatherer qui laisse passer les transactions tant que le notionnel **cumulé** reste ≤ plafond, et **s'arrête** à la première qui le dépasserait (sans l'émettre) : la source ne doit plus être lue après elle. Il doit fonctionner sur un flux infini (les tests lisent au plus 1 000 éléments et comptent ceux que tu as lus).
3. **`movingAverages(List<Long> prices, int window)`** : moyennes glissantes (division entière) sur des fenêtres de `window` prix, avec `Gatherers.windowSliding`. Moins de `window` prix : liste vide. `window` ≤ 0 : `IllegalArgumentException`.
4. **`runningExposure(List<Trade> trades)`** : le notionnel cumulé après chaque transaction, avec `Gatherers.scan`.

Les listes renvoyées sont non modifiables. Un même gatherer doit pouvoir servir pour plusieurs streams sans que leurs calculs se mélangent.
