---
id: go-ch05-l03
title: "Absence de valeur, maps, slices et tampons"
source: { chapter: 6, pages: "155-160" }
duration_min: 25
concepts:
  - id: go-pointer-optional
    label: "Un pointeur nil distingue « pas de valeur » de « valeur zéro »"
  - id: go-map-pointer
    label: "Une map est un pointeur : préférer une struct dans une API"
  - id: go-slice-header
    label: "Une slice est un en-tête (pointeur, longueur, capacité)"
  - id: go-buffer-reuse
    label: "Réutiliser un tampon au lieu d'allouer à chaque lecture"
glossary:
  - term: "valeur zéro vs absence"
    definition: "Le port 0 est une valeur ; « pas de port défini » est une absence. Un entier ne sait pas les distinguer, un *int oui (nil = absent)."
  - term: "en-tête de slice"
    definition: "Structure de trois champs : un pointeur vers le tableau d'éléments, la longueur et la capacité."
  - term: "tampon (buffer)"
    definition: "Zone mémoire réutilisée pour lire des données par morceaux, afin de ne pas allouer un nouveau tableau à chaque lecture."
  - term: "allocation"
    definition: "Réservation d'un bloc de mémoire. Sur le tas, elle sollicite ensuite le ramasse-miettes."
visuals: [go-ch05-slice-header]
labs: [go-ch05-l03-lab-optional]
xp: 30
---

## Pourquoi c'est important

Deux questions de conception reviennent sans cesse : comment dire « cette valeur n'est pas renseignée » ? et comment lire des gigaoctets de données sans saturer la mémoire ? Les pointeurs et les slices répondent aux deux. Et comprendre qu'une map ou une slice contient *déjà* un pointeur éclaire tout ce que tu as vu sur leur comportement en paramètre.

## Valeur zéro ou absence de valeur ?

Un `int` à `0` est-il « zéro » ou « non renseigné » ? Un entier ne peut pas le dire. Quand la distinction compte (un port facultatif, un champ de configuration, une valeur JSON qui peut être `null`), on utilise un **pointeur** :

```go
type Settings struct {
	Port  *int    // nil = non renseigné ; &0 = renseigné à zéro
	Debug *bool   // nil = on garde la valeur par défaut
	Name  *string
}
```

`nil` signifie « absent », un pointeur non nil signifie « présent », **même si la valeur pointée est le zéro**. C'est pourquoi les champs d'une struct qui sert à lire du JSON sont souvent des pointeurs : le décodeur distingue un champ absent d'un champ à `0` ou `""`.

### Mais pas partout

Un pointeur indique aussi la **mutabilité** : n'en mets pas partout pour dire « optionnel ».

- Pour une valeur de retour, préfère l'idiome *comma ok* : `value, ok := lookup(key)`. Pas de pointeur qui pourrait être modifié par l'appelant.
- Un pointeur reçu et non nil ne doit pas être modifié sans que ce soit documenté.
- Hors JSON (ou autre protocole externe), une valeur accompagnée d'un booléen est presque toujours plus claire.

```go
// Préfère
func parsePort(s string) (port int, ok bool)
// à
func parsePort(s string) *int
```

## Les maps : un pointeur déguisé

Une map est, dans le runtime, un pointeur vers une structure interne. Passer une map à une fonction copie ce pointeur : toute modification se voit chez l'appelant (tu l'as constaté dans le module précédent).

Pour les **API publiques**, cela rend les maps peu recommandées en entrée ou en sortie :

- Elles ne disent rien de leur contenu : quelles clés ? quels types de valeurs ? Il faut lire le code.
- Elles sont modifiables par n'importe qui, ce qui rend l'effet d'un appel difficile à suivre.

Go est un langage typé. Plutôt que de passer une `map[string]any` « fourre-tout », utilise une **struct**, dont les champs sont déclarés. Une map est le bon choix quand les clés **ne sont pas connues à la compilation** (un compteur par mot, un index).

## Les slices : trois champs

Une slice est une petite structure de trois champs :

::visual{id="go-ch05-slice-header"}

Quand tu **copies** une slice (affectation ou passage de paramètre), on copie ces trois champs : la copie pointe vers le **même tableau**.

- **Modifier un élément** de la copie change le tableau partagé : visible dans l'original.
- **`append` avec de la capacité disponible** écrit dans le tableau partagé et change la longueur **de la copie seulement**. L'original ne voit pas les nouvelles valeurs : elles sont au-delà de sa longueur.
- **`append` sans capacité disponible** alloue un nouveau tableau, y copie les éléments, et met à jour le pointeur, la longueur et la capacité **de la copie**. Les deux slices pointent alors vers des tableaux différents.

```go
s := make([]int, 2, 5)
t := append(s, 9)          // il y a de la place : même tableau
fmt.Println(len(s), len(t)) // 2 3
```

Conséquence : une fonction qui reçoit une slice peut changer son **contenu**, jamais sa **taille**. Par défaut, suppose qu'une fonction ne modifie pas la slice qu'on lui passe, et documente celles qui le font.

> **Pourquoi une slice de n'importe quelle taille passe à une fonction, et pas un array ?** Une slice est toujours la même petite structure (deux entiers et un pointeur). Un array de taille N est passé entier, et sa taille fait partie de son type.

## Les slices comme tampons

Beaucoup de langages lisent une ressource ainsi : à chaque tour de boucle, ils allouent un nouveau morceau de données, le traitent, puis l'abandonnent. Chaque morceau est de la mémoire que le ramasse-miettes devra nettoyer.

En Go idiomatique, on alloue **une seule fois** un tampon et on le réutilise :

```go
file, err := os.Open(fileName)
if err != nil {
	return err
}
defer file.Close()

data := make([]byte, 100)         // un seul tampon
for {
	count, err := file.Read(data)  // remplit les `count` premiers octets de data
	process(data[:count])          // on ne traite que la partie remplie
	if err != nil {
		if errors.Is(err, io.EOF) {
			return nil
		}
		return err
	}
}
```

C'est justement la propriété qu'on vient de voir : la fonction `Read` ne peut pas changer la longueur de `data`, mais elle peut **écrire dans son contenu**. `io.EOF` n'est pas un échec : c'est le signal normal « plus de données ».

Attention : `process` reçoit une vue sur le tampon, qui sera **écrasée** à la lecture suivante. Si elle doit conserver les données, elle doit les copier.

## Pièges fréquents

- **Utiliser `0` ou `""` comme « absent »** quand ces valeurs sont aussi valides.
- **Pointeur en retour pour dire « optionnel »** : préfère `(valeur, ok)`.
- **Passer des maps dans une API publique** : l'appelant ne sait pas ce qu'elle contient.
- **Garder une sous-slice d'un gros tampon** : elle retient tout le tableau en mémoire.
- **Stocker `data[:count]` d'un tampon réutilisé** sans le copier : les données seront écrasées.

## À retenir

- Pour distinguer « pas de valeur » de « zéro », utilise un pointeur nil (surtout pour JSON) ; sinon `(valeur, ok)`.
- Une map est un pointeur : passer une map partage son contenu. Dans une API, préfère une struct.
- Une slice = (pointeur, longueur, capacité). La copie partage le tableau mais a sa propre longueur.
- Une fonction modifie le contenu d'une slice reçue, jamais sa taille.
- Pour lire par morceaux, alloue un tampon une fois et réutilise-le.
