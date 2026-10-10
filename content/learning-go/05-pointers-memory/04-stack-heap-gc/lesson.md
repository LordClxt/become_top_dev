---
id: go-ch05-l04
title: "Pile, tas et ramasse-miettes"
source: { chapter: 6, pages: "160-163" }
duration_min: 30
concepts:
  - id: go-stack-heap
    label: "La pile (rapide, sans ramasse-miettes) et le tas (géré par le GC)"
  - id: go-escape-analysis
    label: "L'analyse d'échappement : quand une valeur passe de la pile au tas"
  - id: go-gc-cost
    label: "Le coût du ramasse-miettes et l'avantage de produire peu de déchets"
  - id: go-mechanical-sympathy
    label: "Les valeurs contiguës sont plus rapides que les pointeurs dispersés"
glossary:
  - term: "pile (stack)"
    definition: "Zone mémoire contiguë où vivent les variables locales d'un appel de fonction. On l'alloue et la libère en déplaçant un seul pointeur."
  - term: "tas (heap)"
    definition: "Zone mémoire gérée par le ramasse-miettes, pour les données dont la durée de vie dépasse l'appel ou dont la taille est inconnue."
  - term: "analyse d'échappement"
    definition: "Étude faite par le compilateur pour décider si une valeur peut rester sur la pile ou doit « s'échapper » vers le tas."
  - term: "ramasse-miettes (GC)"
    definition: "Mécanisme qui retrouve les données du tas qui n'ont plus de pointeur vers elles, et libère leur mémoire."
  - term: "mechanical sympathy"
    definition: "Écrire du logiciel en tenant compte du fonctionnement du matériel : lire la mémoire dans l'ordre est bien plus rapide que sauter d'une adresse à l'autre."
visuals: [go-ch05-stack-heap]
labs: [go-ch05-l04-lab-allocs]
xp: 30
---

## Pourquoi c'est important

« Go est garbage-collecté, donc je n'ai pas à penser à la mémoire. » C'est vrai pour la correction du programme, faux pour sa vitesse. Un ramasse-miettes (GC) est précieux, mais plus tu lui fournis de déchets, plus il prend de temps à ton programme. Comprendre où vivent tes données explique pourquoi Go te conseille d'utiliser les pointeurs avec parcimonie.

## La pile

La **pile** est un bloc de mémoire contigu. Chaque appel de fonction y réserve un **cadre** pour ses paramètres et ses variables locales. Un pointeur de pile mémorise la dernière position utilisée :

- **allouer** = avancer ce pointeur de la taille de la variable ;
- **libérer** = le ramener au début du cadre quand la fonction se termine.

C'est extrêmement rapide, et il n'y a **rien** à nettoyer ensuite : la mémoire d'un cadre disparaît avec lui.

Pour stocker une valeur sur la pile, sa taille doit être **connue à la compilation**. C'est le cas des types valeur de Go : les nombres, les booléens, les arrays (c'est pour ça que la taille fait partie du type d'un array) et les structs. Un pointeur a aussi une taille connue.

> Go peut même faire **grandir** la pile pendant l'exécution, parce que chaque goroutine a la sienne et que le runtime les gère. Les piles démarrent petites, au prix d'une copie quand elles grossissent.

## Le tas

Le **tas** est la mémoire gérée par le ramasse-miettes. Une donnée y vit tant qu'on peut y accéder par une chaîne de pointeurs depuis une variable de la pile. Quand plus rien ne pointe vers elle, c'est un **déchet**, et le GC la libère.

Pourquoi ne pas tout mettre sur le tas ? Parce que le tas coûte plus cher, de deux façons.

## Quand une valeur « s'échappe » vers le tas

Une donnée pointée peut rester sur la pile si **toutes** ces conditions sont vraies :

1. c'est une variable locale dont la taille est connue à la compilation ;
2. le pointeur n'est pas renvoyé par la fonction ;
3. si le pointeur est transmis à une autre fonction, le compilateur peut garantir que (1) et (2) restent vraies.

Sinon, la donnée **s'échappe** vers le tas. Par exemple : une fonction qui renvoie un pointeur vers une de ses variables locales.

```go
func makePerson() *Person {
	p := Person{Name: "Ada"}
	return &p                // p doit survivre à la fonction : elle s'échappe vers le tas
}
```

En C, renvoyer l'adresse d'une variable locale produit un pointeur vers de la mémoire invalide. **En Go, le compilateur voit le cas et place la variable sur le tas** : le programme est correct, au prix d'une allocation.

::visual{id="go-ch05-stack-heap"}

Tu peux demander au compilateur ce qu'il a décidé :

```bash
go build -gcflags=-m ./...
# ./main.go:8:2: moved to heap: p
```

L'analyse n'est pas parfaite : des données qui pourraient rester sur la pile s'échappent parfois. Elle est **prudente** (elle n'ose pas laisser une référence invalide) et progresse à chaque version de Go.

## Pourquoi le tas coûte cher

### 1. Le ramasse-miettes travaille

Retrouver la mémoire libre et les blocs encore référencés n'est pas gratuit : c'est du temps pris sur le travail de ton programme. Le GC de Go est conçu pour la **faible latence** : chaque cycle ne met le programme en pause que moins de 500 microsecondes. Mais si ton programme produit énormément de déchets, le GC n'arrive pas à tout traiter en un cycle : il ralentit et la consommation mémoire grimpe.

### 2. Le matériel aime la mémoire contiguë

La RAM se lit beaucoup plus vite **séquentiellement**. Une slice de structs range toutes ses données les unes à la suite des autres : rapide à charger et à parcourir. Une slice de **pointeurs** vers des structs (ou des structs dont les champs sont des pointeurs) éparpille les données dans la mémoire : l'accès via des pointeurs placés au hasard est de l'ordre de **cent fois plus lent**.

```go
type Point struct{ X, Y int }

compact := make([]Point, 1_000_000)     // 1 bloc contigu : rapide à parcourir
scattered := make([]*Point, 1_000_000)  // un million d'adresses vers des blocs dispersés
```

Écrire du code qui tient compte du matériel s'appelle la **mechanical sympathy** (le terme vient du sport automobile : le pilote qui comprend sa voiture en tire le meilleur). En suivant les bonnes pratiques de Go, tu l'obtiens presque gratuitement.

## Comparaison avec Java

En Java, les variables locales sont sur la pile, mais **chaque objet est un pointeur** vers des données sur le tas. Seules les valeurs primitives restent sur la pile. Résultat : le GC fait beaucoup de travail, et une `List` est un pointeur vers un tableau de pointeurs : parcourir une liste revient à sauter dans la mémoire. La JVM compense avec des ramasse-miettes très sophistiqués et très réglables. Python, Ruby et JavaScript ont des machines virtuelles encore moins optimisées, d'où de moins bonnes performances.

Go prend le chemin inverse : **créer moins de déchets** dès le départ. Garder les données sur la pile autant que possible, utiliser des slices de valeurs, réutiliser des tampons. Les bonnes pratiques de Go sont aussi les plus efficaces.

## En pratique

- Préfère les **valeurs** aux pointeurs quand rien n'exige le partage (c'est le conseil de la leçon précédente, avec sa raison).
- Préfère `[]T` à `[]*T` sauf besoin réel.
- Réutilise les tampons (`buf[:0]`, `strconv.AppendInt`) dans le code chaud.
- **Mesure avant d'optimiser** : `go test -bench . -benchmem` et `testing.AllocsPerRun` te disent combien d'allocations fait réellement ton code.

## Pièges fréquents

- **Croire que `&` veut toujours dire « tas »** : un pointeur qui ne quitte pas la fonction peut rester sur la pile.
- **Renvoyer un pointeur « pour éviter une copie »** sur une petite struct : tu forces probablement une allocation.
- **Une slice de pointeurs par habitude** quand une slice de valeurs ferait l'affaire.
- **Optimiser sans mesurer** : le compilateur fait souvent déjà mieux que ton intuition.

## À retenir

- Pile : rapide, sans nettoyage, pour les données de taille connue qui ne survivent pas à l'appel. Tas : géré par le GC.
- Une valeur dont le pointeur est renvoyé (ou dont la taille est inconnue) s'échappe vers le tas ; `go build -gcflags=-m` le montre.
- Le GC de Go vise la faible latence, mais moins il y a de déchets, mieux c'est.
- Les valeurs contiguës (slices de structs) sont bien plus rapides à parcourir que des pointeurs éparpillés.
- Moins de pointeurs, c'est à la fois plus clair et plus rapide.
