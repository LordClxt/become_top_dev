## Contexte

Relay, ton futur service de jobs, doit afficher au démarrage le module et la version de Go avec lesquels il a été construit. Tu vas écrire le petit lecteur de `go.mod` qui extrait ces informations.

## Ta mission

Dans `gomod.go`, implémente :

```go
func Parse(content string) (GoMod, error)
```

Exemple :

```
module example.com/shop          →  Module:    "example.com/shop"
go 1.22                          →  GoVersion: "1.22"
require github.com/google/uuid v1.6.0
require (
	golang.org/x/sync v0.7.0     →  Requires: [{github.com/google/uuid v1.6.0}
	golang.org/x/text v0.15.0       {golang.org/x/sync v0.7.0} {golang.org/x/text v0.15.0}]
)
```

## Règles

- Les commentaires `//` et les lignes vides sont ignorés, même en fin de ligne.
- Les dépendances apparaissent dans l'ordre du fichier, qu'elles soient sur une ligne (`require x v1`) ou dans un bloc `require ( ... )`.
- Sans directive `module`, renvoie l'erreur `ErrNoModule`.

Tu découvres Go : les fonctions `strings.Split`, `strings.Fields` et `strings.Index` suffisent. Les indices sont là si tu bloques sur la syntaxe.
