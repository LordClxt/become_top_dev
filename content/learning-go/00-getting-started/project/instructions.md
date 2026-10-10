## Contexte

Tu as vu ce que fait `make` : il remonte les dépendances, exécute les commandes dans l'ordre et s'arrête au premier échec. Pour vraiment le comprendre, écris-le. Ton mini-make lit le Makefile du chapitre tel quel.

## Ce qui t'est donné

Les types `Target` et `Makefile`, et trois erreurs : `ErrMissingSeparator`, `ErrUnknownTarget`, `ErrCycle`. Tu complètes trois fonctions de `make.go`, un jalon chacune.

## Jalon 1 — `Parse(src string) (Makefile, error)`

Ligne par ligne :

- ligne vide ou commençant par `#` : ignorée ;
- `.DEFAULT_GOAL := build` : cible par défaut. Sans elle, c'est la **première cible** du fichier ;
- `.PHONY: fmt vet` (avec ou sans espace après `:`) : ajoute à `Phony` ;
- `vet: fmt` : une cible et ses dépendances ;
- ligne commençant par une **tabulation** : une commande de la cible courante (sans la tabulation) ;
- ligne commençant par des **espaces** : `ErrMissingSeparator`, avec le numéro de ligne dans le message.

## Jalon 2 — `Plan(goal string) ([]string, error)`

`goal` vide = cible par défaut. Renvoie les cibles dans l'ordre d'exécution :

```
Plan("build") → [fmt vet build]
release: test build   test: gen   build: gen
Plan("release") → [gen test build release]   (gen une seule fois)
```

Cible ou dépendance inconnue : `ErrUnknownTarget`. Boucle `a → b → a` : `ErrCycle`.

## Jalon 3 — `Run(goal string, exec func(cmd string) error) ([]string, error)`

Appelle `exec` pour chaque commande du plan, dans l'ordre. Au premier échec, arrête-toi et renvoie les commandes lancées (y compris celle en échec) et une erreur qui **nomme la cible** et **enveloppe** l'erreur d'origine : `fmt.Errorf("[%s] %w", cible, err)`. `%w` permet à l'appelant de retrouver l'erreur d'origine avec `errors.Is` (on y revient au module Erreurs).

## Contraintes

- Uniquement la bibliothèque standard (`strings.Cut`, `strings.Fields`, `slices.Contains` sont tes amis).
- Les variables de Makefile (`X = 1`) ne sont pas demandées.
