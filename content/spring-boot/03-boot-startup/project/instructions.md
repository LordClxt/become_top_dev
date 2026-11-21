## Contexte

Jusqu'ici, Tixa se lançait à la main, avec des valeurs en dur. Ce jalon en fait une vraie application Spring Boot : configurable, différente selon l'environnement, et qui refuse de démarrer quand il lui manque quelque chose.

Fournis : `Bank` (l'interface du prestataire) et `StartupLog`. Tu modifies `TixaApp`, `TixaProperties`, `Banks`, `StartupCheck` et `application.yml`. Tests par jalon : `jboot M1`, `M2`, `M3`.

## M1 — La configuration typée

`TixaProperties` est lié au préfixe `tixa` et trouvé automatiquement :
- `tixa.fee-cents` : 150 par défaut, jamais négatif (sinon le démarrage échoue) ;
- `tixa.hold-timeout` : `15m` par défaut ;
- `tixa.bank-url` : sans défaut.

## M2 — Une banque par environnement

Dans `Banks` (une classe `@Configuration`), deux beans `Bank` :
- hors du profil `prod` : une banque `factice`, qui répond toujours ;
- avec `prod` : une banque `live <url>`, qui répond si l'URL commence par `https://`. Sans `tixa.bank-url`, le démarrage échoue avec `tixa.bank-url est obligatoire en production`.

Dans `application.yml` : en `prod`, les frais passent à **200** ; le profil `staging` est un groupe qui active `prod`.

## M3 — Un démarrage qui se vérifie

`StartupCheck` :
- **avant** que l'application soit déclarée prête, vérifie la banque (`ping()`) : si elle ne répond pas, le démarrage échoue avec `la banque ne répond pas : <nom>` ; sinon il note `banque joignable : <nom>` dans `StartupLog` ;
- **quand** l'application est prête, note `Tixa prêt (<profils actifs, ou default>, frais <frais>)`.
