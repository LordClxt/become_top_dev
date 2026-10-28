## archkit, épisode 7

Le réseau n'est pas fiable et la latence n'est pas nulle : cet épisode transforme les deux premières erreurs du calcul distribué en outils. Le temps (`Clock`) et le hasard (`random`) sont injectés, pour des tests déterministes.

### Jalon 1 : `backoffDelays` et `retry`
- Délai avant la tentative k + 1 (k = 1, 2, …) : `floor(random() × min(maxMs, baseMs × 2^(k−1)))`. C'est le **full jitter** : chaque client tire au hasard sous un plafond qui double.
- `retry(fn, opts)` appelle `fn(attempt)` (1, 2, …) ; en cas d'erreur, s'il reste des tentatives et que `retryable(e)` (vrai par défaut) l'autorise, il attend `clock.sleep(délai)` puis recommence. Sinon il lève la dernière erreur.

### Jalon 2 : `CircuitBreaker`
- **Fermé** : on appelle ; un succès remet le compteur d'échecs à zéro ; au `failureThreshold`-ième échec **consécutif**, le circuit s'**ouvre**.
- **Ouvert** : tout appel lève `CircuitOpenError` **sans appeler** le service, jusqu'à `openMs` après l'ouverture.
- **Demi-ouvert** : un **seul** essai passe (les autres appels concurrents sont refusés) ; succès → fermé ; échec → rouvert immédiatement.
- `state()` renvoie l'état courant (un circuit ouvert depuis au moins `openMs` est `half-open`).

### Jalon 3 : `chain` et `percentileOf`
Une distribution associe une latence à un poids. `chain` calcule la distribution **exacte** de la somme de latences indépendantes (convolution), normalisée en probabilités. `percentileOf(d, q)` renvoie la plus petite latence L telle que P(latence ≤ L) ≥ q.
