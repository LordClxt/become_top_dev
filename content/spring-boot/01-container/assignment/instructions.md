## Contexte

Le moteur de tarification expérimentale de Tixa a planté vendredi soir : son constructeur se connecte à un service distant qui était en panne. Il a fallu **redéployer** pour le retirer. L'équipe veut désormais couper une fonctionnalité **par configuration**, au démarrage :

```properties
tixa.features.experimental-pricing=false
```

Chaque bean optionnel est marqué `@Feature("nom")`, sur sa classe `@Component` (`LoyaltyProgram`, `ExperimentalPricing`) ou sur sa méthode `@Bean` (`giftCards()` dans `ShopConfig`). Les beans qui les utilisent passent déjà par `ObjectProvider` (`Checkout`).

Tu édites `FeatureTogglePostProcessor.java` et `ShopConfig.java`.

## Ta tâche

1. Quand `tixa.features.<nom>` vaut faux, le bean correspondant **n'existe pas** dans le conteneur. Absente, la propriété vaut vrai. Les valeurs reconnues par Spring comptent toutes : `false`, `off`, `no`, `0`.
2. Un bean désactivé ne doit **jamais être instancié**, même pas une fois pour être jeté : son constructeur peut appeler un service en panne.
3. `disabledBeans()` renvoie les noms des beans retirés, **triés**.
4. Enregistre le post-processor dans `ShopConfig`, de la bonne façon pour un composant qui travaille avant tous les autres.

## Ce qui sera relu

Au-delà des tests, la revue juge si tu travailles sur les **définitions** (les recettes) plutôt que sur les objets, et si ton enregistrement évite toute instanciation précoce.
