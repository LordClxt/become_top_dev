## Contexte

Pour comprendre une règle, rien ne vaut de l'implémenter. Tu écris un petit interpréteur d'un langage jouet dont les **règles de portée sont celles de Go** : des blocs emboîtés, des déclarations qui masquent, des affectations qui modifient. Une fois que tu l'as écrit, le shadowing n'a plus de secret.

## Ta mission

Dans `scope.go`, implémente :

```go
func Run(program string) ([]string, error)
```

Elle exécute le programme ligne par ligne et renvoie les valeurs affichées par `print`.

### Le langage

Une instruction par ligne. Les espaces en bordure sont ignorés ; les lignes vides et celles qui commencent par `//` aussi (mais elles comptent dans la numérotation).

| Instruction | Effet |
|---|---|
| `var NAME = INT` | **déclare** `NAME` dans le bloc courant |
| `NAME := INT` | idem |
| `NAME = INT` | **modifie** la variable `NAME` la plus proche, en remontant les blocs |
| `print NAME` | ajoute la valeur de la variable `NAME` la plus proche à la sortie |
| `{` | ouvre un bloc |
| `}` | ferme le bloc courant |

`INT` est un entier décimal, éventuellement négatif. Un nom est une lettre ou `_` suivi de lettres, chiffres ou `_` ; `var` et `print` ne sont pas des noms valides. Les espaces sont obligatoires autour de `=` et `:=` (`x=2` est une erreur de syntaxe).

### Les erreurs

Une erreur s'arrête immédiatement et se formate `ligne N : message` (N compte à partir de 1, lignes vides et commentaires inclus). Les sorties produites **avant** l'erreur sont quand même renvoyées.

| Message | Quand |
|---|---|
| `undefined: NAME` | `print` ou affectation sur un nom introuvable |
| `NAME redeclared in this block` | déclaration d'un nom déjà déclaré **dans le même bloc** |
| `unexpected }` | `}` alors qu'aucun bloc n'est ouvert |
| `missing }` | fin du programme avec un bloc ouvert (la ligne citée est celle du `{` le plus profond encore ouvert) |
| `syntax error` | toute autre ligne invalide |

Redéclarer un nom dans un **bloc interne** est permis : c'est le shadowing.

## Exemple

```
var x = 10
{
	print x      // 10
	x := 5
	print x      // 5
}
print x          // 10
```

## Contrainte

Modélise les blocs comme une **pile** de tables nom → valeur : ouvrir un bloc empile, le fermer dépile, chercher un nom parcourt la pile de l'intérieur vers l'extérieur.
