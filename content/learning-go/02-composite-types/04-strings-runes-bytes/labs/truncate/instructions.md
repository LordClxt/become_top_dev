## Contexte

Une messagerie affiche un aperçu de chaque message, limité à `n` caractères. Les utilisateurs se plaignent : les messages avec accents ou emojis s'affichent avec des `�` à la fin.

## Ta mission

Dans `truncate.go`, corrige :

```go
func Preview(msg string, n int) string
```

- Si `msg` contient au plus `n` caractères, renvoie-le tel quel.
- Sinon, renvoie ses `n` premiers caractères suivis de `…` (un seul caractère, U+2026).
- Si `n <= 0`, renvoie une chaîne vide.

```go
Preview("Bonjour", 3)      // "Bon…"
Preview("Café crème", 4)   // "Café…"
Preview("🙂🙂🙂", 2)        // "🙂🙂…"
Preview("Salut", 10)       // "Salut"
```

## Contraintes

- `n` compte des **caractères** (runes), pas des bytes.
- Le résultat doit toujours être de l'UTF-8 valide.
