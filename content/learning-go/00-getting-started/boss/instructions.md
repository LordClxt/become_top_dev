## Contexte

Vendredi, 18 h. Une stagiaire pousse son premier module Go et la CI tombe en panne. Avant de relancer quoi que ce soit, tu écris l'outil qui relit le module et liste **tous** les problèmes d'un coup : la version de `go.mod`, les pièges de la règle des points-virgules, et les appels à `fmt` que vet refuserait.

Tu as 60 minutes. Tout le module y passe.

## Ta mission

Dans `review.go`, implémente :

```go
func Review(gomod, src, toolchain string) []Finding
```

`gomod` est le contenu de `go.mod`, `src` celui de `main.go`, `toolchain` la version de Go de la CI (`"1.22"`). Chaque problème devient un `Finding{File, Line, Check, Msg}`, avec un message en français. Le résultat est trié par fichier (`go.mod` avant `main.go`) puis par ligne.

`lexer.go` te fournit `needsSemicolon(line)` et `stripComment(line)` (la solution du TP de la leçon 2).

## 1. `gomod`

- La ligne `go X.Y[.Z]` exige une version **plus récente** que `toolchain` : un Finding sur cette ligne. Attention, `1.10` est plus récent que `1.9`.
- Pas de directive `module` : un Finding à la ligne `0`.
- Les commentaires `//` sont ignorés.

## 2. `syntax`

Une ligne de code après laquelle le lexer insère un `;`, suivie (lignes vides et commentaires sautés) d'une ligne qui commence par `{`, `.`, `else`, ou un opérateur binaire (`&&`, `||`, `==`, `!=`, `+`, `-`, `/`, `%`, `,`). Signale la ligne **qui commence** par ce token, comme le compilateur.

```
func main()      ← ; inséré ici
{                ← Finding syntax, ligne 2
```

## 3. `vet`

Pour chaque appel `fmt.X(...)` qui tient sur une ligne :

- `Printf`, `Sprintf`, `Errorf` (format en 1ᵉʳ argument), `Fprintf` (format en 2ᵉ) : si le format est un littéral de string, compare le nombre de valeurs lues (verbes et `*`) au nombre de valeurs passées. Signale aussi un `%` seul en fin de format et un verbe inconnu.
- `Print`, `Println`, `Sprint`, `Sprintln`, `Fprint`, `Fprintln` : signale un littéral de string qui contient un verbe.
- Un appel imbriqué (`fmt.Println(fmt.Sprintf(...))`) est vérifié aussi.

Les arguments se séparent par les virgules **de premier niveau** : `f(a, b)` et `[]int{1, 2}` comptent pour un argument chacun.

## Hors sujet

Raw strings et appels sur plusieurs lignes, commentaires `/* */`.
