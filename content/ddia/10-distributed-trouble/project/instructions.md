## Contexte

Tinybase a désormais un **leader** par partition. Mais le chapitre l'a montré : un leader peut se figer (GC, VM suspendue), le réseau peut avaler ses battements de cœur, et un timeout fixe accuse à tort. Tu écris les trois pièces qui rendent la bascule sûre. Tout le temps passe par une **horloge injectée** (`Clock`) : les tests avancent une `ManualClock` à la main, sans aucun `time.Sleep`. Les lectures sont **monotones** (`time.Duration` depuis un instant arbitraire) : jamais d'heure murale.

## Jalon 1 — Le détecteur de pannes adaptatif
- `Heartbeat(node)` : le premier battement fixe l'instant de référence ; chaque suivant ajoute l'intervalle depuis le précédent. Ne garde que les `window` derniers intervalles.
- `Timeout(node)` : **moyenne + k × écart-type** (écart-type de population) des intervalles gardés, jamais moins que `minTimeout` ; sans intervalle, `minTimeout`.
- `Suspected(node)` : vrai si `maintenant − dernier battement` **dépasse strictement** le timeout ; un nœud jamais entendu est suspect.

Exemple : intervalles 100, 300, 100, 300 ms et k = 2 donnent 200 + 2 × 100 = **400 ms**.

## Jalon 2 — Le service de baux
- `Acquire(client)` : si aucun bail valide (`maintenant < Expires`) n'est détenu par un autre, accorde un nouveau bail avec le jeton **précédent + 1** (le premier vaut 1) et `Expires = maintenant + ttl`. Le détenteur actuel récupère son bail inchangé. Sinon `ErrLeaseHeld`.
- `Renew(client, token)` : prolonge le bail courant sans changer de jeton, si `client` le détient avec ce jeton et qu'il n'a pas expiré ; sinon `ErrNotHolder`.
- Le service doit être sûr quand plusieurs goroutines appellent `Acquire` en même temps.

## Jalon 3 — Le stockage qui vérifie les jetons
- `Write(key, value, token)` : jeton 0 → `ErrMissingToken` ; jeton **plus petit** que le plus grand accepté pour cette clé → `ErrStaleToken`, rien ne change ; sinon on écrit et on retient le jeton (un jeton égal est accepté : c'est le détenteur actuel qui écrit encore).
- `Get(key)` et `HighestToken(key)`.

Les tests du jalon 3 rejouent le scénario du livre : le client 1 vérifie son bail, se fige 15 s, le client 2 obtient le bail et écrit ; le client 1 se réveille et écrit avec son vieux jeton. Le stockage doit le rejeter.
