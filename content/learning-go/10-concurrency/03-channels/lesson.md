---
id: go-ch10-l03
title: 'Les channels : communiquer entre goroutines'
source:
  chapter: 12
  pages: 321-327
duration_min: 50
concepts:
- id: go-channel-basics
  label: Un channel (make(chan T)) transmet des valeurs d'une goroutine à une autre ; c'est un type référence dont la valeur zéro est nil
- id: go-chan-directions
  label: 'Directions : <-chan T (lecture seule) et chan<- T (écriture seule) documentent et contrôlent l''usage d''un channel'
- id: go-chan-unbuffered
  label: 'Channel sans tampon : l''envoi et la réception se synchronisent en un rendez-vous, chacun bloque jusqu''à l''autre'
- id: go-chan-buffered
  label: 'Channel tamponné : l''envoi ne bloque que si le tampon est plein, la réception que s''il est vide ; len et cap'
- id: go-chan-close
  label: close est appelé par l'écrivain, une seule fois ; lire un channel fermé donne la valeur zéro (ok = false) ; for range s'arrête à la fermeture
- id: go-chan-states
  label: 'Comportement selon l''état (ouvert, fermé, nil, avec ou sans tampon) : certains cas bloquent, d''autres paniquent'
glossary:
- term: channel
  definition: Conduit typé par lequel des goroutines s'envoient des valeurs, de façon synchronisée.
- term: rendez-vous
  definition: 'Sur un channel sans tampon, l''émetteur et le récepteur doivent être là en même temps : la valeur passe de l''un à l''autre.'
- term: tampon (buffer)
  definition: 'File d''attente intégrée d''un channel : jusqu''à cap valeurs peuvent être déposées sans récepteur.'
- term: idiome « comma ok »
  definition: 'v, ok := <-ch : ok vaut false quand le channel est fermé et vide.'
visuals:
- go-ch10-unbuffered-rendezvous
- go-ch10-buffered-queue
- go-ch10-channel-states
labs:
- go-ch10-l03-lab-channel-basics
- go-ch10-l03-lab-channel-states
xp: 50
---

## Pourquoi c'est important

Des goroutines qui travaillent chacune dans leur coin ne servent à rien : il faut qu'elles **échangent des résultats** et **se synchronisent**. Go propose pour cela les **channels**, avec un principe directeur : *ne communique pas en partageant la mémoire, partage la mémoire en communiquant*.

## Créer et utiliser un channel

Un channel est un conduit **typé**. On le crée avec `make` :

```go
ch := make(chan int)
```

L'opérateur `<-` envoie ou reçoit selon le côté où il se trouve :

```go
ch <- 42      // envoyer 42 sur ch
v := <-ch     // recevoir une valeur de ch
<-ch          // recevoir et ignorer
```

Chaque valeur envoyée n'est lue que **par une seule goroutine** : si plusieurs lisent le même channel, elles se partagent les valeurs. Un channel est un **type référence** (comme les maps et les slices) : le passer à une fonction ne le copie pas, les deux côtés voient le même conduit. Sa **valeur zéro est `nil`**.

### Les directions

Un paramètre peut restreindre l'usage :

```go
func producer(out chan<- int) { out <- 1 }   // écriture seule
func consumer(in <-chan int)  { <-in }       // lecture seule
```

C'est de la documentation que le compilateur vérifie : un `consumer` ne pourra pas envoyer, un `producer` ne pourra pas lire. Une fonction qui **renvoie** un channel doit en général renvoyer `<-chan T`, pour que l'appelant ne puisse que lire.

## Sans tampon : le rendez-vous

Par défaut, un channel est **sans tampon** (capacité 0). Un envoi **bloque** jusqu'à ce qu'une autre goroutine reçoive, et une réception **bloque** jusqu'à ce qu'une autre envoie. Les deux se terminent **ensemble** : c'est un rendez-vous. Ce n'est pas seulement un transfert de valeur, c'est une **synchronisation**.

::visual{id="go-ch10-unbuffered-rendezvous"}

## Avec tampon : une file d'attente

`make(chan int, 3)` crée un channel **tamponné** de capacité 3 : on peut y déposer 3 valeurs sans qu'aucun récepteur soit là. L'envoi ne bloque que si le tampon est **plein** ; la réception ne bloque que s'il est **vide**. `len(ch)` donne le nombre de valeurs en attente, `cap(ch)` la capacité. Les valeurs sortent dans l'ordre d'entrée.

::visual{id="go-ch10-buffered-queue"}

Un tampon découple le rythme de l'émetteur de celui du récepteur, jusqu'à une limite. Quand il est plein, l'émetteur ralentit : c'est de la **contre-pression** naturelle.

## Fermer un channel

`close(ch)` signale qu'**aucune valeur ne sera plus envoyée**. Règles à retenir :

- c'est **l'écrivain** qui ferme, jamais le lecteur ;
- on ferme **une seule fois** : refermer provoque un `panic` ;
- **lire un channel fermé** est toujours permis : on reçoit d'abord les valeurs restantes du tampon, puis la **valeur zéro** à l'infini ;
- pour distinguer « zéro envoyé » de « channel fermé », on utilise l'idiome *comma ok* : `v, ok := <-ch`, où `ok` vaut `false` si le channel est fermé et vide ;
- `for v := range ch` lit jusqu'à la fermeture, puis sort de la boucle : c'est la façon courante de consommer un flux.

Fermer n'est pas obligatoire pour libérer la mémoire (le ramasse-miettes s'en charge) : on ferme pour **prévenir les lecteurs** qu'il n'y aura plus rien. Un channel fermé sert aussi de signal de diffusion : tous les lecteurs bloqués sont réveillés d'un coup.

## Le tableau des comportements

Selon l'état d'un channel, lire, écrire et fermer se comportent différemment : bloquer, réussir ou paniquer. C'est la table à connaître par cœur.

::visual{id="go-ch10-channel-states"}

En résumé : **lire un channel fermé est sûr, écrire dedans ne l'est jamais**, et un channel `nil` bloque pour toujours en lecture comme en écriture (ce qui devient utile dans un `select`, voir la leçon suivante).

## Pièges fréquents

- **Fermer côté lecteur**, ou fermer deux fois : `panic`.
- **Écrire sur un channel fermé** : `panic`.
- **Oublier de fermer** un channel parcouru par `range` : la boucle bloque pour toujours.
- **Utiliser un channel `nil`** par oubli du `make` : toute lecture ou écriture bloque sans fin.
- **Ajouter un tampon pour « réparer » un blocage** sans comprendre la cause : le problème revient quand le tampon se remplit.

## À retenir

- `make(chan T)` : rendez-vous synchrone ; `make(chan T, n)` : file d'attente de taille n.
- `<-chan T` et `chan<- T` restreignent l'usage ; l'écrivain ferme, une seule fois.
- Lire un channel fermé : valeurs restantes puis zéro (`ok == false`) ; écrire ou refermer : panic.
- `range` sur un channel s'arrête à la fermeture ; `nil` bloque pour toujours.
