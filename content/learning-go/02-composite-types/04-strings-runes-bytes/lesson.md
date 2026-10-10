---
id: go-ch02-l04
title: "Strings, runes et bytes : parler UTF-8"
source: { chapter: 3, pages: "76-79" }
duration_min: 20
concepts:
  - id: go-string-bytes
    label: "Une string est une suite de bytes"
  - id: go-string-utf8
    label: "UTF-8 : un caractère peut faire 1 à 4 bytes"
  - id: go-string-conversions
    label: "Conversions entre string, []byte et []rune"
glossary:
  - term: "byte"
    definition: "Alias de uint8. Une string est stockée comme une suite de bytes."
  - term: "rune"
    definition: "Alias de int32. Représente un point de code Unicode (un « caractère »)."
  - term: "UTF-8"
    definition: "Encodage d'Unicode qui utilise 1 octet pour les caractères ASCII et jusqu'à 4 pour les autres."
  - term: "point de code"
    definition: "Numéro qu'Unicode attribue à un caractère. Par exemple, é vaut U+00E9."
visuals: [go-ch02-utf8-bytes]
labs: [go-ch02-l04-lab-truncate]
xp: 30
---

## Pourquoi c'est important

Ton application affichera des prénoms accentués, des emojis, du japonais. Si tu découpes une string au mauvais endroit, tu affiches des caractères cassés (`�`). C'est un bug visible par tous tes utilisateurs, et il n'apparaît jamais dans des tests écrits uniquement en anglais.

## Une string, c'est des bytes

En Go, une string est une **suite de bytes**, immuable. L'index et le découpage travaillent en **bytes** :

```go
s := "Hello"
fmt.Println(s[1], s[1:3]) // 101 el
```

`s[1]` renvoie un `byte` (le nombre 101, code de `e`), pas une lettre.

## UTF-8 : tous les caractères n'ont pas la même taille

Go écrit son code source et ses littéraux en UTF-8 :

| Caractère | Bytes en UTF-8 |
|---|---|
| `a` | 1 |
| `é` | 2 |
| `€` | 3 |
| `☀️`, `🙂` | 4 ou plus |

Donc `len` compte des **bytes**, pas des caractères :

```go
fmt.Println(len("café"))  // 5, pas 4
fmt.Println(len("🙂"))    // 4
```

Et découper au milieu d'un caractère le casse :

```go
s := "café"
fmt.Println(s[:4]) // "caf\xc3" : moitié de é, affichée comme �
```

::visual{id="go-ch02-utf8-bytes"}

## Les bons outils

Pour compter les caractères :

```go
utf8.RuneCountInString("café") // 4
```

Pour parcourir les caractères, utilise `for range` : il avance rune par rune (tu le verras en détail au module suivant).

```go
for i, r := range "café" {
    fmt.Println(i, string(r)) // 0 c, 1 a, 2 f, 3 é
}
```

L'index `i` reste une position en **bytes**.

## Conversions

```go
s := "café"
b := []byte(s) // [99 97 102 195 169] : les bytes UTF-8
r := []rune(s) // [99 97 102 233] : les points de code
string(r[3])   // "é"
```

- `[]byte` : le plus courant, c'est le format des fichiers et du réseau.
- `[]rune` : quand tu dois accéder aux caractères par position. Chaque conversion copie les données.

## Le piège string(int)

```go
x := 65
fmt.Println(string(x)) // "A", pas "65" !
```

`string` sur un entier interprète le nombre comme un point de code. `go vet` le signale. Pour écrire un nombre en texte, utilise `strconv.Itoa(x)`.

## Le package strings

`strings.ToUpper`, `strings.Split`, `strings.Contains`, `strings.Fields`… gèrent correctement l'UTF-8. Préfère-les à tes propres manipulations d'index.

## Pièges fréquents

- Utiliser `len(s)` pour vérifier une limite de caractères (pseudo, tweet).
- Couper avec `s[:n]` un texte qui peut contenir des accents ou des emojis.
- Convertir un nombre en texte avec `string(n)`.

## À retenir

- Index, découpage et `len` travaillent en bytes.
- Un caractère UTF-8 fait de 1 à 4 bytes.
- Pour les caractères : `utf8.RuneCountInString`, `for range`, `[]rune`.
- Pour convertir un nombre en texte : `strconv.Itoa`.
