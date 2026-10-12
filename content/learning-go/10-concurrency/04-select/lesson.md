---
id: go-ch10-l04
title: 'select : attendre plusieurs channels à la fois'
source:
  chapter: 12
  pages: 327-331
duration_min: 45
concepts:
- id: go-select
  label: select attend plusieurs opérations de channel et exécute la première qui est prête ; si plusieurs le sont, il en choisit une au hasard
- id: go-select-random
  label: Le choix aléatoire évite qu'une case soit privilégiée (pas de famine) ; l'ordre d'écriture des cases ne compte pas
- id: go-deadlock
  label: 'Deadlock : toutes les goroutines sont bloquées sans issue ; le runtime le détecte quand aucune ne peut avancer'
- id: go-select-default
  label: default rend select non bloquant ; dans un for, il crée une boucle active qui consomme 100 % d'un cœur
- id: go-for-select
  label: 'for-select : boucle qui traite plusieurs sources jusqu''à une condition d''arrêt'
- id: go-nil-channel-select
  label: 'Un channel nil n''est jamais prêt : l''affecter à nil désactive une case de select'
glossary:
- term: select
  definition: Instruction qui attend plusieurs envois ou réceptions sur des channels et exécute celui qui est prêt.
- term: deadlock
  definition: Situation où plus aucune goroutine ne peut avancer, car chacune attend une autre.
- term: famine (starvation)
  definition: Une tâche n'obtient jamais la ressource parce que d'autres sont toujours servies avant elle.
- term: attente active
  definition: Boucle qui teste une condition en continu sans jamais s'endormir, au prix d'un cœur entier.
visuals:
- go-ch10-select-random
- go-ch10-deadlock
labs:
- go-ch10-l04-lab-select-patterns
xp: 45
---

## Pourquoi c'est important

Un `<-ch` simple attend **un** channel. Dans un vrai programme, une goroutine doit souvent attendre **plusieurs choses** : une valeur, un signal d'arrêt, un délai d'expiration. Sans `select`, elle devrait choisir un channel et ignorer les autres, au risque de bloquer. `select` est l'autre pilier de la concurrence en Go, avec les channels.

## La syntaxe

`select` ressemble à un `switch`, mais chaque `case` est une **opération sur un channel** :

```go
select {
case v := <-ch1:
    fmt.Println("ch1 :", v)
case ch2 <- 42:
    fmt.Println("42 envoyé sur ch2")
case <-time.After(time.Second):
    fmt.Println("rien depuis une seconde")
}
```

Il **bloque** jusqu'à ce qu'**une** des opérations puisse avoir lieu, exécute cette case et ressort. Il s'applique aux lectures comme aux envois.

## Plusieurs cases prêtes : le hasard

Si plusieurs cases sont prêtes en même temps, Go en choisit **une au hasard**. Ce n'est pas un défaut : c'est ce qui empêche une case d'être systématiquement servie avant les autres (la **famine**). Conséquence pratique : **l'ordre d'écriture des cases ne compte pas** et ne donne aucune priorité.

::visual{id="go-ch10-select-random"}

## select et deadlock

Un deadlock (« interblocage ») apparaît quand plus aucune goroutine ne peut avancer. Le cas le plus simple : `main` envoie sur un channel sans tampon que personne ne lit. Un cas plus sournois : deux goroutines, chacune attendant une valeur que **l'autre** doit envoyer **après** avoir lu.

Quand **toutes** les goroutines sont endormies, le runtime Go le détecte et arrête le programme avec :

```
fatal error: all goroutines are asleep - deadlock!
```

Deux précisions importantes :

- si **une seule** goroutine peut encore tourner (un serveur HTTP, un `time.Ticker`), le runtime ne dit **rien** et les goroutines bloquées le restent en silence ;
- `select` aide à éviter l'**ordre d'attente** qui provoque un deadlock : au lieu de lire d'abord `a` puis `b`, on lit celui qui arrive en premier.

::visual{id="go-ch10-deadlock"}

## default : ne jamais bloquer

Une case `default` s'exécute **immédiatement** si aucune autre n'est prête. Elle transforme `select` en test **non bloquant** : « y a-t-il une valeur ? sinon je continue ».

```go
select {
case v := <-ch:
    use(v)
default:
    // rien de prêt
}
```

Attention à `default` dans une boucle `for` : la boucle tourne alors **sans jamais dormir**, et consomme un cœur à 100 %. Utilise-le pour un essai ponctuel, pas pour attendre.

## for-select

L'idiome le plus fréquent est un `for` autour d'un `select`, pour traiter plusieurs sources jusqu'à une **condition d'arrêt** :

```go
for {
    select {
    case v, ok := <-in:
        if !ok {
            return          // la source est épuisée
        }
        process(v)
    case <-done:
        return              // on nous demande de nous arrêter
    }
}
```

Une case de sortie (un channel `done`, un `ctx.Done()`) est indispensable : sans elle, la goroutine ne peut jamais s'arrêter (fuite, voir la leçon suivante).

## Désactiver une case avec un channel nil

Un channel `nil` **n'est jamais prêt** : une lecture ou une écriture dessus bloque pour toujours. Dans un `select`, la case correspondante est donc ignorée. On s'en sert pour **désactiver** une case une fois sa source terminée :

```go
for in1 != nil || in2 != nil {
    select {
    case v, ok := <-in1:
        if !ok { in1 = nil; continue }   // fini : cette case ne sera plus jamais choisie
        out = append(out, v)
    case v, ok := <-in2:
        if !ok { in2 = nil; continue }
        out = append(out, v)
    }
}
```

Sans cette astuce, un channel fermé serait relu en boucle (il est toujours « prêt » et renvoie la valeur zéro).

## Pièges fréquents

- **Croire que l'ordre des cases donne une priorité** : le choix est aléatoire.
- **`default` dans un `for`** : boucle active à 100 % CPU.
- **Relire un channel fermé** dans un for-select : valeurs zéro à l'infini ; teste `ok` et mets le channel à nil.
- **Oublier la case de sortie** : la goroutine ne peut plus s'arrêter.
- **Compter sur la détection de deadlock** : elle ne marche que si toutes les goroutines sont bloquées.

## À retenir

- `select` exécute la première case prête, au hasard si plusieurs ; il bloque s'il n'y en a aucune.
- `default` le rend non bloquant ; jamais en boucle serrée.
- for-select + case de sortie : l'idiome standard ; channel nil : désactive une case.
- Deadlock : toutes les goroutines endormies ; détecté par le runtime seulement dans ce cas.
