## Contexte

`go vet` sait qu'un `Printf("%s a %d messages", name)` est faux. Tu vas écrire le cœur de cette vérification : lire une chaîne de format comme le fait `fmt`, et compter les valeurs qu'elle consomme.

C'est un devoir : plus ouvert qu'un TP. Les tests vérifient le résultat, puis une revue (grille ci-dessous) évalue ton code.

## Ta mission

Dans `format.go`, implémente :

```go
func CheckFormat(format string, nargs int) Report
```

`nargs` est le nombre de valeurs passées après le format. Le rapport contient :

- `Verbs` : chaque verbe connu, écrit en entier (`%-10s`, `%.2f`, `%+v`), dans l'ordre ;
- `Unknown` : les verbes que `fmt` ne connaît pas (`%z`) ;
- `Missing` / `Extra` : valeurs manquantes ou en trop ;
- `Trailing` : le format se termine au milieu d'un verbe (`"75%"`).

## La grammaire d'un verbe

```
%  [flags]  [largeur]  [.précision]  lettre
    + - # 0 espace   chiffres ou *    chiffres ou *
```

```
"%s a %d messages", 1  → Verbs [%s %d], Missing 1
"%*d", 2               → Verbs [%*d], OK : * lit la largeur dans une valeur
"75%% fait", 0         → OK : %% est un % littéral, il ne lit rien
"%d %z", 2             → Unknown [%z] ; un verbe inconnu lit quand même une valeur
"fini à 100%", 0       → Trailing
```

Verbes connus : `v T t b c d o O q x X U e E f F g G s p`.

## Hors sujet

Les index explicites (`%[2]d`) et la vérification des types ne sont pas demandés.
