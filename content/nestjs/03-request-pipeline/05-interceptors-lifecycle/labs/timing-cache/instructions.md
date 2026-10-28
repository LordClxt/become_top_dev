## Contexte

Deux besoins transverses, qu'on ne veut écrire dans aucun contrôleur :

- **mesurer** chaque requête : un en-tête `x-response-time-ms` sur les succès, et une mesure `{ route, outcome, ms }` dans `Metrics` pour **chaque** requête, réussie (`'ok'`) ou non (`'error'`). `route` vaut `NomDuContrôleur.nomDeLaMéthode` ;
- **mettre en cache** les routes `GET` décorées `@CacheTtl(ms)` : tant que l'entrée n'a pas expiré, le handler n'est **pas appelé**.

Écris `CacheTtl`, `TimingInterceptor` et `CacheInterceptor` dans `interceptors.ts`. Utilise l'horloge injectée (`Clock`) : les tests la remplacent pour faire avancer le temps.
