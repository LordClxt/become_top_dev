## Contexte

Tixa a trois composants : `EventCatalog` (les événements en vente), `PriceCalculator` (le prix avec les frais de service) et `ReservationService`, qui a besoin des deux premiers. Aujourd'hui, personne ne les assemble.

Tu édites seulement `app/TixaConfig.java`. Les trois classes sont fournies et ne connaissent pas Spring : c'est voulu.

## Ta tâche

Déclare dans `TixaConfig` une **méthode `@Bean` par composant**, pour que `new AnnotationConfigApplicationContext(TixaConfig.class)` démarre avec :

- `eventCatalog` : un `EventCatalog` ;
- `priceCalculator` : un `PriceCalculator` avec **150 centimes** de frais par place ;
- `reservationService` : un `ReservationService` branché sur **les deux beans ci-dessus**.

## Exemple

```java
var ctx = new AnnotationConfigApplicationContext(TixaConfig.class);
ctx.getBean(ReservationService.class).quote("jazz-0612", 2);   // 9300 : (4500 + 150) × 2
```

## Contraintes

- Le service doit recevoir **le** catalogue du conteneur, pas un catalogue créé à côté.
- Les noms des beans sont ceux de la liste ci-dessus.
