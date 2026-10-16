## Contexte

Deux bouts de code d'un même service maltraitent leurs ressources :
- `Connection` compte sur `finalize()` pour se fermer « un jour » ;
- `Transfers.copy` ferme bien ses ressources avec des `try/finally` imbriqués, mais **quand la lecture échoue et que la fermeture échoue aussi, l'erreur de fermeture écrase celle de lecture**. En production, le journal dit « fermeture impossible » et personne ne comprend la panne.

Tu édites `Connection.java` et `Transfers.java`. `Source` et `Sink` sont fournies.

## 1. `Connection`

- Elle implémente `AutoCloseable` pour s'utiliser dans un `try (…)`.
- `close()` émet `"BYE"` **une seule fois**, même si on l'appelle deux fois.
- Après fermeture, `isClosed()` vaut `true` et `send(...)` lève `IllegalStateException` (avec le message refusé dans le texte de l'exception).
- Plus de `finalize()`.

## 2. `Transfers.copy`

Même comportement qu'aujourd'hui (copie, fermeture de la destination puis de la source, source fermée même si la destination ne s'ouvre pas), plus :
- si la copie échoue, **c'est son exception qui remonte** ; l'échec de fermeture y est attaché comme exception **supprimée** (`getSuppressed()`) ;
- si les deux fermetures échouent, la première (destination) remonte et la seconde lui est attachée.

Un indice : il y a une construction du langage qui fait tout ça pour toi.
