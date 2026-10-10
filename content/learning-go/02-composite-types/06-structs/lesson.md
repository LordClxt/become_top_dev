---
id: go-ch02-l06
title: "Structs : regrouper des données liées"
source: { chapter: 3, pages: "85-89" }
duration_min: 18
concepts:
  - id: go-struct-literals
    label: "Littéraux de struct : positionnels ou nommés"
  - id: go-struct-anonymous
    label: "Structs anonymes"
  - id: go-struct-comparable
    label: "Comparer et convertir des structs"
glossary:
  - term: "struct"
    definition: "Type qui regroupe des champs nommés, chacun avec son propre type."
  - term: "struct anonyme"
    definition: "Struct déclarée sans lui donner de nom de type, utilisée pour une seule variable."
  - term: "valeur zéro d'une struct"
    definition: "Struct dont chaque champ vaut la valeur zéro de son type."
visuals: [go-ch02-struct-literals]
labs: [go-ch02-l06-lab-payroll]
xp: 30
---

## Pourquoi c'est important

Une map impose le même type à toutes ses valeurs et accepte n'importe quelle clé. Pour décrire une entité précise (un utilisateur, une commande), on veut des champs **connus à l'avance**, chacun avec son type. C'est le rôle de la struct.

Go n'a pas de classes ni d'héritage. Les structs, avec les méthodes que tu verras plus tard, couvrent ce besoin autrement.

## Déclarer et créer

```go
type Person struct {
    Name string
    Age  int
    Pet  string
}

var fred Person    // valeur zéro : {"" 0 ""}
bob := Person{}    // identique
```

Contrairement à une map, une struct vide et une struct non initialisée sont **la même chose**.

## Deux styles de littéraux

```go
julia := Person{"Julia", 40, "chat"}           // positionnel : tous les champs, dans l'ordre
beth := Person{Name: "Beth", Age: 30}          // nommé : n'importe quel ordre, champs omis = zéro
```

**Préfère le style nommé.** Il se lit sans regarder la définition, et il ne casse pas quand on ajoute un champ à la struct. On ne peut pas mélanger les deux styles.

On lit et écrit les champs avec un point : `beth.Pet = "chien"`.

## Structs anonymes

On peut créer une struct sans lui donner de nom de type :

```go
pet := struct {
    Name string
    Kind string
}{
    Name: "Fido",
    Kind: "chien",
}
```

Deux usages courants :
- décrire la forme de données JSON reçues ou envoyées ;
- les **tests en table**, que tu utilises déjà dans les TP : une slice de structs anonymes, une par cas de test.

```go
cases := []struct {
    in   string
    want int
}{
    {"a", 1},
    {"bb", 2},
}
```

## Comparer des structs

Une struct est comparable avec `==` si **tous ses champs** le sont. Une struct qui contient une slice ou une map ne l'est pas : il faut écrire sa propre fonction de comparaison.

Deux structs de types différents ne se comparent pas, même avec des champs identiques. On peut convertir l'une en l'autre seulement si les champs ont **les mêmes noms, le même ordre et les mêmes types**.

Petite exception : une struct anonyme se compare et s'assigne directement à une struct nommée de même forme.

::visual{id="go-ch02-struct-literals"}

## Struct ou map ?

| | struct | map |
|---|---|---|
| Champs connus à l'avance | ✅ | ❌ |
| Types différents par champ | ✅ | ❌ (un seul type de valeur) |
| Clés inventées à l'exécution | ❌ | ✅ |

Pour passer des données entre fonctions, utilise une struct.

## Pièges fréquents

- Utiliser le style positionnel : l'ajout d'un champ casse tous les littéraux.
- Utiliser une `map[string]any` là où une struct décrirait clairement les données.
- Comparer avec `==` une struct qui contient une slice : erreur de compilation.
- Écrire `m[k].Total += 1` sur une `map[string]MaStruct` : ne compile pas. Une valeur de map n'est pas modifiable sur place : lis-la dans une variable, modifie-la, puis réécris-la (`t := m[k]; t.Total++; m[k] = t`).

## À retenir

- Une struct regroupe des champs nommés et typés.
- Préfère les littéraux nommés : `Person{Name: "Ana"}`.
- Les structs anonymes servent au JSON et aux tests en table.
- `==` fonctionne si tous les champs sont comparables.
