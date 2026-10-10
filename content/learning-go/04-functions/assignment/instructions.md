## Contexte

Un serveur web traite chaque requête en la faisant passer par une série de couches : journalisation, validation, réessais, mise en forme. En Go, on les écrit comme des **middlewares** : des fonctions qui prennent un handler et en renvoient un autre, enrichi. C'est le motif d'ordre supérieur par excellence, et tu as déjà tous les ingrédients : fonctions comme valeurs, closures, variadiques.

```go
type Handler func(request string) (string, error)
type Middleware func(Handler) Handler
```

## Ta mission

Dans `middleware.go`, implémente cinq fonctions.

### `Chain(h Handler, middlewares ...Middleware) Handler`
Enveloppe `h` avec tous les middlewares. **Le premier de la liste est le plus extérieur** : il s'exécute en premier à l'aller et en dernier au retour.

```
Chain(h, A, B, C)  →  A avant, B avant, C avant, h, C après, B après, A après
```

### `Logging(logf func(string)) Middleware`
Appelle `logf("start <requête>")` avant le handler, puis `logf("end <requête> ok")` ou `logf("end <requête> error: <message>")` après. La réponse et l'erreur passent inchangées.

### `Retry(attempts int) Middleware`
Relance le handler jusqu'à `attempts` essais **au total** (au moins un, même si `attempts ≤ 0`). Renvoie le premier succès, ou l'erreur du **dernier** essai.

### `WithPrefix(prefix string) Middleware`
Ajoute `prefix` devant la réponse en cas de succès. En cas d'erreur, la réponse est vide et l'erreur passe inchangée.

### `Validate(check func(request string) error) Middleware`
Si `check` renvoie une erreur, la requête est refusée avec cette erreur et le handler n'est **pas appelé**.

## Contraintes

- Aucune variable de package : tout l'état vit dans les closures.
- Une chaîne doit pouvoir servir plusieurs requêtes.
- Compose-les : `Chain(h, Logging(log), Validate(check), Retry(3), WithPrefix("# "))` doit journaliser **une seule fois** pour l'ensemble, même s'il y a plusieurs essais.
