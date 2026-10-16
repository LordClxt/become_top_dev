## Contexte

`TokenService` émet des jetons de session valables 15 minutes. Tel qu'il est écrit, il lit l'heure avec `Instant.now()` et compte ses identifiants dans un champ `static`. Résultat : pour tester l'expiration, il faudrait attendre 15 minutes, et deux services partagent le même compteur. C'est le problème des ressources **câblées en dur**.

Tu édites `TokenService.java` et `SequentialIds.java`. `Token` est un `record` fourni.

## 1. Injecter les dépendances

`TokenService(Clock clock, Supplier<String> ids)` reçoit :
- l'**horloge** (`java.time.Clock`) qui donne l'heure courante ;
- une **fabrique d'identifiants** (`Supplier<String>`), appelée une fois par jeton.

`issue(user)` et `isValid(token)` n'utilisent plus que ces dépendances. Plus aucun état `static` modifiable dans `TokenService`. Les `null` sont refusés (`NullPointerException`).

Un jeton expire **exactement** à `émission + 15 min` : à cet instant, `isValid` renvoie `false`.

## 2. Un singleton qui ne peut pas être dupliqué

`SequentialIds.INSTANCE` produit `"tok-1"`, `"tok-2"`… pour toute la JVM, sans doublon même entre threads. Transforme-le en **singleton enum**, qui implémente toujours `Supplier<String>`.

## 3. Le câblage de production

`TokenService.system()` renvoie un service branché sur `Clock.systemUTC()` et `SequentialIds.INSTANCE`. Le singleton reste un détail de câblage : le service, lui, ne le connaît pas.
