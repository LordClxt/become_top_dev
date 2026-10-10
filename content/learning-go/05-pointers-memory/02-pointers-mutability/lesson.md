---
id: go-ch05-l02
title: "Pointeurs et paramètres modifiables"
source: { chapter: 6, pages: "147-154" }
duration_min: 30
concepts:
  - id: go-pointer-vs-class
    label: "Un pointeur Go se comporte comme les objets de Java ou Python"
  - id: go-pointer-mutable-param
    label: "Un pointeur en paramètre signale que la fonction peut modifier la donnée"
  - id: go-pointer-copy-semantics
    label: "On copie le pointeur : réaffecter ne se voit pas, écrire à travers se voit"
  - id: go-pointer-last-resort
    label: "Préférer renvoyer des valeurs ; le pointeur est un dernier recours"
glossary:
  - term: "mutable"
    definition: "Se dit d'une donnée qu'on peut modifier après sa création. Go n'a pas de déclaration d'immuabilité : on choisit entre valeur et pointeur."
  - term: "aliasing"
    definition: "Plusieurs variables qui désignent la même donnée en mémoire."
  - term: "paramètre de sortie"
    definition: "Pointeur passé à une fonction pour qu'elle le remplisse, au lieu de renvoyer une valeur. À réserver à quelques cas (json.Unmarshal)."
  - term: "effet de bord"
    definition: "Modification d'un état extérieur à la fonction (ici, la donnée vers laquelle pointe un paramètre)."
visuals: [go-ch05-pointer-update]
labs: [go-ch05-l02-lab-accounts]
xp: 30
---

## Pourquoi c'est important

« Quand dois-je passer un pointeur ? » est la question n°1 des développeurs Go débutants. La réponse tient en une ligne : **un paramètre pointeur dit que la fonction peut modifier la donnée de l'appelant**. Le reste de cette leçon explique pourquoi, ce que ça implique (notamment le piège du pointeur `nil`) et pourquoi, la plupart du temps, il vaut mieux **renvoyer une valeur**.

## Rien de nouveau si tu connais Java ou Python

En Java, JavaScript, Python ou Ruby, il existe deux comportements selon qu'on manipule un type primitif ou un objet :

```python
class Foo:
    def __init__(self, x): self.x = x

def outer():
    f = Foo(10)
    inner1(f); print(f.x)    # 20 : le champ modifié se voit
    inner2(f); print(f.x)    # 20 : réaffecter le paramètre ne se voit pas
    g = None
    inner2(g); print(g is None)  # True : passer None puis réaffecter ne se voit pas

def inner1(f): f.x = 20
def inner2(f): f = Foo(30)
```

On dit parfois que les objets y sont « passés par référence ». C'est faux : si c'était le cas, les cas 2 et 3 changeraient la variable de l'appelant. Ces langages sont **tous passés par valeur**, comme Go. Ce qui se passe : chaque objet est en réalité un **pointeur**. Passer un objet copie le pointeur ; modifier un champ agit sur la donnée partagée, réaffecter le paramètre ne change que la copie.

Quand tu utilises un pointeur en Go, tu retrouves **exactement** ces trois comportements. La différence : Go te laisse **choisir** entre valeur et pointeur, y compris pour les structs et les types primitifs. Dans le doute, choisis une **valeur** : elle rend plus lisible quand et comment les données changent.

## Un pointeur dit « mutable »

Go n'a pas de mot-clé `final`, `readonly` ou `const` pour les variables ordinaires. Le choix valeur / pointeur joue ce rôle :

- Passer une **valeur** (primitif, struct, array) garantit que la fonction ne peut pas modifier l'original : elle travaille sur une copie.
- Passer un **pointeur** déclare que la fonction **peut** modifier la donnée d'origine.

Un lecteur qui voit `func Deposit(a *Account, amount int)` comprend sans lire le corps que l'`Account` de l'appelant sera modifié.

## Les deux conséquences de la copie

Le pointeur est lui-même passé par valeur : la fonction reçoit **une copie de l'adresse**. D'où deux règles.

### 1. On ne peut pas rendre non nil un pointeur nil reçu en paramètre

```go
func failedUpdate(g *int) {
	x := 10
	g = &x          // on change la copie de l'adresse, pas la variable de l'appelant
}

func main() {
	var f *int      // nil
	failedUpdate(f)
	fmt.Println(f)  // <nil>
}
```

`f` est copié dans `g` (tous deux `nil`). Faire pointer `g` ailleurs ne change pas `f`. Pour que l'appelant récupère un pointeur non nil, la fonction doit le **renvoyer**.

### 2. Pour changer la valeur, il faut écrire à travers le pointeur

```go
func failedUpdate(px *int) {
	x2 := 20
	px = &x2         // modifie la copie du pointeur : sans effet pour l'appelant
}

func update(px *int) {
	*px = 20         // écrit dans la case mémoire partagée
}

func main() {
	x := 10
	failedUpdate(&x)
	fmt.Println(x)   // 10
	update(&x)
	fmt.Println(x)   // 20
}
```

Dans `update`, `px` est une copie de l'adresse de `x`, mais *les deux désignent la même case*. `*px = 20` y écrit : `x` vaut 20 en revenant. Dans `failedUpdate`, on a seulement fait pointer la copie ailleurs.

::visual{id="go-ch05-pointer-update"}

## Les pointeurs : un dernier recours

Les pointeurs rendent le flux des données plus difficile à suivre et ajoutent du travail pour le ramasse-miettes. **Plutôt que de remplir une struct reçue par pointeur, fabrique-la et renvoie-la.**

```go
// À éviter
func MakeFoo(f *Foo) error {
	f.Field1 = "val"
	f.Field2 = 20
	return nil
}

// À préférer
func MakeFoo() (Foo, error) {
	f := Foo{Field1: "val", Field2: 20}
	return f, nil
}
```

### L'exception : quand l'API attend une interface

On passe un pointeur pour **remplir** une donnée quand la fonction reçoit une `any` ou une interface. Cas typique : `json.Unmarshal`.

```go
var f struct {
	Name string `json:"name"`
	Age  int    `json:"age"`
}
err := json.Unmarshal([]byte(`{"name": "Bob", "age": 30}`), &f)
```

`Unmarshal` ne peut pas renvoyer une valeur du bon type (elle date d'avant les génériques) et ce style permet de réutiliser une même variable dans une boucle sans réallouer. Ne prends pas cette exception pour la règle.

### Renvoyer un pointeur ou une valeur ?

Renvoie une **valeur** par défaut. Renvoie un **pointeur** seulement quand le type a un **état à modifier** (des tampons d'entrée-sortie, certains types de concurrence) ou quand la structure est très grande.

## Et les performances ?

Passer un pointeur coûte à peu près 1 nanoseconde quelle que soit la taille de la donnée. Passer une valeur coûte de plus en plus cher quand elle grossit (de l'ordre de 0,7 ms vers 10 Mo). Mais pour **renvoyer**, c'est étonnamment le contraire sous ~10 Mo : renvoyer une petite structure par valeur est plus rapide que renvoyer un pointeur (qui peut forcer une allocation sur le tas). Ces temps sont minuscules ; ne choisis un pointeur pour la performance que sur des données de plusieurs mégaoctets et après avoir mesuré.

## Pièges fréquents

- **Réaffecter le paramètre** (`g = &x`) en croyant changer l'appelant.
- **Passer un pointeur nil** à une fonction qui doit le remplir : elle ne peut rien y écrire. Valide d'abord (`if a == nil { return err }`).
- **Utiliser un pointeur « pour aller plus vite »** sur une petite struct : c'est souvent plus lent et moins lisible.
- **Remplir une struct par pointeur** quand on pourrait la renvoyer.
- **Modifier un pointeur reçu sans le documenter** : l'appelant ne s'y attend pas.

## À retenir

- Go est toujours passé par valeur ; un pointeur copié désigne la même donnée.
- Un paramètre pointeur signifie « cette fonction peut modifier la donnée » ; une valeur garantit le contraire.
- Réaffecter le pointeur reçu est sans effet ; écrire à travers (`*p = …` ou `p.Champ = …`) agit sur l'original.
- On ne rend pas non nil un pointeur nil de l'appelant : on renvoie le pointeur.
- Préfère renvoyer des valeurs ; le pointeur en sortie est une exception (JSON, interfaces).
