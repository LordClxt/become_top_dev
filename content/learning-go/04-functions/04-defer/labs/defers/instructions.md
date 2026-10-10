## Contexte

Tu écris deux briques de fiabilité pour Relay : une **session** qui ouvre plusieurs ressources et les referme dans le bon ordre quoi qu'il arrive, et un **gestionnaire de transaction** qui valide ou annule selon le résultat. Les deux reposent sur `defer`.

## Ta mission

Dans `defers.go`, implémente :

### `Session(names []string) (log []string, err error)`

Ouvre les ressources dans l'ordre, travaille, puis les ferme dans l'ordre **inverse**. Le journal `log` contient :

- `"open X"` à chaque ouverture ;
- `"work"` une fois que **tout** est ouvert ;
- `"close X"` à chaque fermeture.

```
Session(["a", "b"]) → [open a, open b, work, close b, close a]
```

Si un nom est **vide**, l'ouverture s'arrête et la fonction renvoie `ErrEmptyName`. Les ressources déjà ouvertes sont **quand même fermées** (ordre inverse), et `"work"` n'a pas lieu :

```
Session(["a", "b", "", "d"]) → [open a, open b, close b, close a], ErrEmptyName
```

Les fermetures doivent être faites par des `defer`, et visibles dans le journal renvoyé : il te faudra un retour nommé.

### `WithTx(begin func() (Tx, error), work func(Tx) error) (err error)`

| Situation | Ce qui doit se passer |
|---|---|
| `begin` échoue | renvoie son erreur ; rien d'autre n'est appelé |
| `work` réussit | `Commit` ; si `Commit` échoue, `Rollback` puis renvoie l'erreur du `Commit` |
| `work` renvoie une erreur | `Rollback`, jamais de `Commit` ; renvoie l'erreur de `work` |
| `work` **panique** | `Rollback`, jamais de `Commit` ; la panique **continue** (n'utilise pas `recover`) |

Si le `Rollback` échoue aussi, ajoute son erreur avec `errors.Join`. Si le `Rollback` réussit, renvoie l'erreur d'origine **telle quelle** (pas d'enveloppe inutile).

Toute la validation / annulation doit être faite dans un `defer`.

## Piège

Dans le cas de la panique, le `defer` s'exécute alors que `err` vaut encore `nil`. Un `if err == nil { Commit() }` naïf validerait une transaction dont le travail a échoué. Il te faut un moyen de savoir que `work` a bien terminé.
