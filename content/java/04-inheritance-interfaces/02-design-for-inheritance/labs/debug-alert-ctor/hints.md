## Hint 1
Lis le constructeur d'`Alert` ligne par ligne. Qu'appelle-t-il ? Et quand cet appel s'exécute-t-il par rapport à la ligne `this.symbol = …` de `ThresholdAlert` ?

## Hint 2
Un constructeur ne doit appeler aucune méthode redéfinissable : `describe()` s'exécute sur une sous-classe à moitié construite. Déplacer l'affectation avant `super(...)` (Java 25) répare `ThresholdAlert`, mais pas `KeywordAlert`, que tu ne peux pas modifier. Le défaut est dans `Alert`.

## Hint 3
Retire l'écriture au journal du constructeur et place-la dans `arm()`, rendue `final` (elle appelle une méthode redéfinissable : documente-le avec `@implSpec`), avec une garde pour ne l'écrire qu'une fois. Puis `public final class ThresholdAlert`.
