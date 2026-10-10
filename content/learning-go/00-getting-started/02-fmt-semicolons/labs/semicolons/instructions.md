## Contexte

Tu écris un petit outil qui explique aux débutants les erreurs `unexpected semicolon or newline`. Il doit savoir, pour chaque ligne, si le lexer de Go va insérer un point-virgule à la fin.

## Ta mission

Dans `semicolon.go`, implémente :

```go
func NeedsSemicolon(line string) bool
```

Elle renvoie `true` si le dernier token de la ligne est :

- un identifiant (`x`, `int`, `main`) ou un nombre (`42`, `3.14`) ;
- un littéral de string (`"…"`, `` `…` ``) ou de rune (`'a'`) ;
- `break`, `continue`, `fallthrough` ou `return` ;
- `++`, `--`, `)`, `]` ou `}`.

```
func main()      → true   (le piège de l'accolade à la ligne)
func main() {    → false
total := a +     → false  (l'expression continue)
x := y // note   → true   (le commentaire ne compte pas)
} else           → false  (else est un mot-clé)
```

## Contraintes

- Ignore un commentaire `//` de fin de ligne, mais pas un `//` situé dans une string : `"http://relay.dev"`.
- Les mots-clés de Go ne sont pas des identifiants : seuls les quatre cités terminent une instruction.
- Une ligne vide ou ne contenant qu'un commentaire renvoie `false`.
