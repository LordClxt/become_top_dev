---
id: go-ch04-l05
title: "Go passe tout par valeur"
source: { chapter: 5, pages: "138-140" }
duration_min: 20
concepts:
  - id: go-call-by-value
    label: "Un paramètre est toujours une copie de l'argument"
  - id: go-map-slice-param
    label: "Maps et slices : le contenu se modifie, mais la slice ne grandit pas"
glossary:
  - term: "appel par valeur"
    definition: "Mode de passage où la fonction reçoit une copie de l'argument. Modifier la copie ne change pas la variable de l'appelant."
  - term: "en-tête de slice"
    definition: "Petite structure (pointeur vers les données, longueur, capacité) qui représente une slice. C'est elle que l'on copie, pas les éléments."
  - term: "alias (aliasing)"
    definition: "Situation où deux variables donnent accès aux mêmes données : modifier par l'une se voit par l'autre."
  - term: "effet de bord"
    definition: "Modification, par une fonction, d'un état extérieur à ses résultats : une variable de l'appelant, un fichier, une map."
visuals: [go-ch04-by-value]
labs: [go-ch04-l05-lab-copies]
xp: 25
---

## Pourquoi c'est important

« Si je passe ma variable à une fonction, la fonction peut-elle la modifier ? » La réponse dépend du langage, et elle est la source de la moitié des surprises des débutants. En Go la règle de base est simple et sans exception : **tout est passé par valeur**. Ce qui rend la chose délicate, c'est que certaines valeurs (les maps, les slices) *contiennent* des références vers des données partagées.

## La règle : une copie

Quand tu passes une variable à une fonction, Go **copie sa valeur** dans le paramètre. La fonction travaille sur la copie.

```go
type person struct {
	age  int
	name string
}

func modifyFails(i int, s string, p person) {
	i = i * 2
	s = "Goodbye"
	p.name = "Bob"
}

func main() {
	p := person{}
	i := 2
	s := "Hello"
	modifyFails(i, s, p)
	fmt.Println(i, s, p)   // 2 Hello {0 }
}
```

Rien n'a changé dans `main`. Ça vaut aussi pour la struct : si tu viens de Java, Python ou JavaScript, où passer un objet permet de le modifier, c'est une vraie différence.

::visual{id="go-ch04-by-value"}

## Les maps et les slices se comportent différemment

Regarde ce qui se passe quand on essaie de modifier une map et une slice dans une fonction :

```go
func modMap(m map[int]string) {
	m[2] = "hello"
	m[3] = "goodbye"
	delete(m, 1)
}

func modSlice(s []int) {
	for k, v := range s {
		s[k] = v * 2
	}
	s = append(s, 10)
}

m := map[int]string{1: "first", 2: "second"}
modMap(m)
fmt.Println(m)            // map[2:hello 3:goodbye]

s := []int{1, 2, 3}
modSlice(s)
fmt.Println(s)            // [2 4 6]
```

- **La map** est modifiée : tous les changements sont visibles par l'appelant.
- **La slice** : les éléments sont modifiés (`[2 4 6]`), mais l'`append` final n'est **pas** visible : l'appelant garde une slice de longueur 3.

La règle est cohérente. Go copie *bien* la valeur, mais la valeur d'une map ou d'une slice est un **petit descripteur qui pointe vers des données** :

- une map est (en interne) un pointeur vers sa table : la copie pointe vers la même table ;
- une slice est un en-tête `(pointeur, longueur, capacité)` : la copie pointe vers le même tableau d'éléments, mais sa longueur est **à part**. Modifier un élément se voit ; changer la longueur ne se voit pas.

> **Chaque type de Go est un type valeur. Simplement, parfois, la valeur est un pointeur.**

Cela vaut aussi pour les maps et slices **à l'intérieur d'une struct** : copier la struct copie l'en-tête, pas les éléments.

```go
type box struct{ items []int }
func fill(b box) { b.items[0] = 100 }
b := box{items: []int{1, 2}}
fill(b)
fmt.Println(b.items)   // [100 2] : la struct est copiée, le tableau est partagé
```

### Ce qu'on en tire dans le code

- Une fonction qui reçoit une slice peut changer ses éléments (c'est utile : trier, inverser sur place).
- Pour **agrandir** une slice, la fonction doit la **renvoyer** : `s = grow(s)`, comme `append`.
- Pour ne **pas** abîmer la slice de l'appelant, copie avant de modifier (`slices.Clone`).
- Une fonction qui prend une map peut la modifier : documente-le, ou renvoie une nouvelle map.

## L'avantage du passage par valeur

Comme les variables sont copiées, **appeler une fonction ne peut pas modifier tes variables simples** (sauf si tu lui donnes une slice ou une map). C'est ce qui permet de raisonner sur le flux de données : une fonction qui renvoie des valeurs nouvelles est plus facile à comprendre qu'une fonction qui en modifie en cachette.

Mais parfois on a *besoin* de passer quelque chose de modifiable. C'est le rôle des **pointeurs**, dans le prochain module.

## Pièges fréquents

- **Croire qu'on modifie sa struct** en la passant à une fonction : on modifie la copie.
- **`s = append(s, x)` dans la fonction** sans renvoyer `s` : l'appelant ne voit pas la nouvelle longueur.
- **`append(s[:i], s[i+1:]...)`** pour supprimer un élément : cela *réécrit le tableau partagé* et corrompt la slice de l'appelant.
- **Modifier la map d'un paramètre** sans le dire : effet de bord surprenant.
- **Supposer qu'une struct qui contient une slice est entièrement copiée** : le tableau d'éléments, lui, reste partagé.

## À retenir

- Go passe tout **par valeur** : le paramètre est une copie de l'argument.
- Une map copiée pointe vers la même table ; une slice copiée pointe vers le même tableau mais a sa propre longueur.
- Donc : éléments modifiables, longueur non. Pour agrandir, on renvoie la slice.
- Pour changer une variable simple ou une struct, il faut renvoyer la nouvelle valeur… ou un pointeur (prochain module).
