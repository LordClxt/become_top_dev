## Contexte

Relay exécute des **jobs** : de petites fonctions qui reçoivent des arguments et renvoient un résultat.

```go
type Job func(args []string) (string, error)
```

Tu construis son cœur : un registre pour retrouver les jobs par leur nom, des décorateurs pour leur ajouter des comportements, et un pipeline pour les enchaîner. Tout repose sur des fonctions qui prennent et renvoient des fonctions.

## Jalon 1 : le registre

Le registre est une simple `map[string]Job`.

- `Register(registry, name, job) error` : ajoute le job. Erreurs : `ErrEmptyName` (nom vide), `ErrNilJob` (job `nil`), `ErrDuplicateJob` (nom déjà pris : le job d'origine **n'est pas écrasé**).
- `Run(registry, name, args...) (string, error)` : exécute le job. Nom absent : `ErrUnknownJob`.
- `Names(registry) []string` : les noms enregistrés, **triés**.

Enveloppe tes erreurs avec `%w` pour que `errors.Is` fonctionne.

## Jalon 2 : les décorateurs

```go
type Decorator func(Job) Job
```

- `WithRetry(attempts)` : relance le job jusqu'à `attempts` essais au total (au moins un), renvoie le premier succès ou l'erreur du dernier essai.
- `WithDefaults(defaults...)` : place les arguments par défaut **devant** ceux de l'appel. Chaque appel doit recevoir un **tableau neuf** : un job qui modifie ses arguments ne doit jamais influencer l'appel suivant, et l'appelant doit pouvoir réutiliser sa slice `defaults` sans effet sur le décorateur.
- `MapOutput(f)` : transforme la sortie d'un job réussi. Une erreur passe inchangée, avec une sortie vide.
- `Decorate(job, decorators...)` : empile les décorateurs. **Le premier de la liste est le plus extérieur.**

## Jalon 3 : le pipeline

```go
type Step struct {
	Job  string
	Args []string
}
```

`Pipe(registry, steps) (string, error)` exécute les étapes dans l'ordre. Chaque étape reçoit ses `Args`, **suivis, sauf la première, de la sortie de l'étape précédente** (dernier argument). Elle renvoie la sortie de la dernière étape (`""` pour un pipeline vide).

À la première erreur, l'exécution s'arrête (les étapes suivantes ne sont pas lancées) et l'erreur est enveloppée avec le contexte : `étape 2 (fail) : explosion`. Elle doit rester testable avec `errors.Is`.

`Pipe` ne doit **jamais modifier** les `Args` de tes étapes, même si leur slice a de la capacité libre.

## Contraintes

- Aucune variable de package (le job `Join` fourni est une fonction, pas un état).
- Pense à l'aliasing : `append` sur une slice reçue peut écraser le tableau de l'appelant.
