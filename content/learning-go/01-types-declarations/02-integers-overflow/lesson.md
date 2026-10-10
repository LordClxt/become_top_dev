---
id: go-ch01-l02
title: "Entiers, opérateurs et débordement"
source: { chapter: 2, pages: "44-46" }
duration_min: 25
concepts:
  - id: go-int-types
    label: "Les types entiers et le choix de la taille"
  - id: go-int-division
    label: "Division entière tronquée et division par zéro"
  - id: go-bit-ops
    label: "Opérateurs bit à bit, dont &^"
  - id: go-int-overflow
    label: "Débordement silencieux (wraparound)"
glossary:
  - term: "wraparound"
    definition: "Quand un calcul dépasse la plage d'un type entier, le résultat « fait le tour » : 255 + 1 vaut 0 pour un byte."
  - term: "complément à deux"
    definition: "Représentation des entiers signés : le bit de poids fort pèse −2ⁿ⁻¹, ce qui fait de 0b1000_0000 la valeur −128 sur 8 bits."
  - term: "alias"
    definition: "Autre nom pour le même type : byte est exactement uint8, rune est exactement int32."
  - term: "masque de bits"
    definition: "Entier dont les bits à 1 sélectionnent les bits à lire ou modifier dans une autre valeur."
visuals: [go-ch01-int-overflow]
labs: [go-ch01-l02-lab-checked]
xp: 30
---

## Pourquoi c'est important

Un entier qui déborde ne plante pas : il renvoie une mauvaise valeur, sans un mot. Des calculs de tailles, de délais ou de quantités mal bornés sont à l'origine de vrais incidents de sécurité. Comprendre précisément ce que fait un entier Go quand on le pousse hors de sa plage est une compétence de base.

## Les types entiers

Go fournit des entiers signés et non signés, de 1 à 8 octets :

| Signé | Plage | Non signé | Plage |
|---|---|---|---|
| `int8` | −128 à 127 | `uint8` | 0 à 255 |
| `int16` | −32 768 à 32 767 | `uint16` | 0 à 65 535 |
| `int32` | ≈ ±2,1 milliards | `uint32` | 0 à ≈ 4,3 milliards |
| `int64` | ≈ ±9,2 × 10¹⁸ | `uint64` | 0 à ≈ 1,8 × 10¹⁹ |

Leur valeur zéro est `0`. Trois noms spéciaux à connaître :

- **`byte`** est un alias de `uint8` : les deux sont interchangeables, mais on écrit `byte` pour des octets.
- **`int`** (et `uint`) a la taille du processeur : 64 bits sur la plupart des machines actuelles, 32 sur d'autres. Comme sa taille varie, Go interdit de le mélanger avec `int32` ou `int64` sans conversion explicite. **Les littéraux entiers sont des `int` par défaut.**
- **`rune`** est un alias de `int32`, on le retrouvera avec les strings.

### Quel type choisir ?

Trois règles suffisent :

1. Un format de fichier ou un protocole impose une taille précise (un champ de 16 bits non signé) : utilise le type correspondant (`uint16`).
2. Une fonction de bibliothèque doit marcher avec n'importe quel entier : utilise un paramètre de type générique (chapitre sur les generics).
3. Dans tous les autres cas : **`int`**.

> **Au-delà du livre.** Résiste à l'envie de prendre `uint` « parce qu'une longueur n'est jamais négative » : `len(x) - 1` sur une collection vide donne alors un énorme nombre au lieu de −1. La bibliothèque standard elle-même renvoie des `int` pour les longueurs.

## Les opérateurs

Arithmétique : `+ - * /` et `%` (reste). Chacun se combine avec `=` : `+=`, `-=`, `*=`, `/=`, `%=`. Comparaisons : `== != < <= > >=`.

### Division entière

La division de deux entiers donne un entier, **tronqué vers zéro** (pas vers le bas) :

```go
fmt.Println(7/2, -7/2, 7/-2)  // 3 -3 -3
fmt.Println(7%2, -7%2, 7%-2)  // 1 -1 1
```

Le reste prend le signe du dividende : `-7 % 2` vaut `-1`, ce qui surprend ceux qui viennent de Python. Diviser par **zéro** déclenche un `panic` à l'exécution (si le diviseur est une constante, c'est une erreur de compilation). Pour obtenir un résultat décimal, convertis d'abord en flottant (leçon sur les conversions).

### Opérateurs bit à bit

| Opérateur | Rôle | Exemple (8 bits) |
|---|---|---|
| `&` | ET | `0b1100 & 0b1010 = 0b1000` |
| `\|` | OU | `0b1100 \| 0b1010 = 0b1110` |
| `^` | OU exclusif | `0b1100 ^ 0b1010 = 0b0110` |
| `&^` | ET NON (« efface ces bits ») | `0b1100 &^ 0b1010 = 0b0100` |
| `<<` `>>` | décalages | `1 << 3 = 8` |

`&^` est la spécialité de Go : `x &^ mask` met à zéro les bits de `x` présents dans `mask`. C'est exactement l'opération « retirer une permission » :

```go
const (
	read  = 0b100
	write = 0b010
	exec  = 0b001
)
perms := 0o755 // rwxr-xr-x
perms &^= write // en retire le bit d'écriture
```

## Le débordement : pas de panique, un tour complet

Quand un calcul sort de la plage du type, Go **ne signale rien** : le résultat fait le tour.

```go
var b byte = 255
b++               // 0
var x int8 = 127
x++               // -128
var u uint8 = 3
u -= 5            // 254
```

::visual{id="go-ch01-int-overflow"}

Le dernier cas est le piège des non signés : soustraire plus que ce qu'on a ne donne pas un négatif, mais un très grand nombre.

Une exception : une **constante** qui ne rentre pas est une erreur de compilation. `var b byte = 256` ne compile pas. C'est donc le calcul fait à l'exécution qui est dangereux.

### Détecter un débordement

Il n'existe pas d'opérateur « checked » : tu le détectes toi-même.

- Pour une addition signée : un débordement a eu lieu si les deux opérandes ont le même signe et que le résultat a un signe différent.
- Pour une multiplication non signée : si `a != 0` et que `(a*b)/a != b`, le produit a débordé.
- Le paquet `math/bits` fournit des opérations avec retenue (`bits.Add64`, `bits.Mul64`) quand tu travailles avec des tailles de 64 bits.

## Pièges fréquents

- **Compter à rebours avec un non signé.** `for i := uint(n); i >= 0; i--` ne s'arrête jamais : `i >= 0` est toujours vrai.
- **`(a + b) / 2` pour une moyenne.** Si `a + b` déborde, le résultat est faux. Sur des `int32`, calcule en `int64`.
- **Croire que `%` est un modulo mathématique.** C'est un reste : il peut être négatif.
- **`int` vs `int64`.** `len(s)` est un `int` ; l'assigner à un `int64` sans conversion ne compile pas.

## À retenir

- Entiers : `int8…int64`, `uint8…uint64`, plus `int`, `uint`, `byte`, `rune`. Dans le doute : `int`.
- La division entière tronque vers zéro, le reste suit le signe du dividende, et `/ 0` fait paniquer.
- `&^` efface des bits ; `x &^ mask` est « retirer ces drapeaux ».
- Un calcul qui sort de la plage fait le tour sans erreur : à toi de le détecter quand l'entrée n'est pas de confiance.
