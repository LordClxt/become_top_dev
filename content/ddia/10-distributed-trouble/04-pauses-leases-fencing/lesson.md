---
id: ddia-ch10-l04
title: Pauses, baux et jetons de clôture
source:
  chapter: 8
  pages: 303-310
duration_min: 50
concepts:
- id: ddia-process-pause
  label: 'Un processus peut être suspendu des secondes sans le savoir (GC, VM, E/S, swap, SIGSTOP) : le code croit que le temps n''a pas passé'
- id: ddia-lease-bug
  label: 'Vérifier qu''un bail est valide puis agir est incorrect : une pause entre la vérification et l''action laisse agir avec un bail expiré'
- id: ddia-majority-truth
  label: 'La vérité est définie par la majorité (quorum) : un nœud ne peut pas se fier seulement à son propre jugement'
- id: ddia-fencing-token
  label: 'Jeton de clôture : numéro croissant accordé avec le verrou, que la ressource vérifie pour rejeter les écritures périmées'
- id: ddia-fencing-check-resource
  label: C'est la ressource protégée qui doit vérifier le jeton, pas le client
- id: ddia-byzantine
  label: 'Fautes byzantines : nœuds qui mentent ; hors périmètre de la plupart des systèmes, mais on se protège des corruptions accidentelles
    (sommes de contrôle, validation)'
glossary:
- term: bail (lease)
  definition: 'Verrou avec expiration : le détenteur le perd s''il ne le renouvelle pas à temps.'
- term: jeton de clôture (fencing token)
  definition: Nombre croissant renvoyé à chaque octroi du verrou ; la ressource refuse les jetons plus anciens que le dernier vu.
- term: quorum
  definition: Majorité de nœuds dont l'accord décide, de sorte qu'il ne peut pas y avoir deux majorités.
- term: faute byzantine
  definition: Un nœud se comporte de façon arbitraire ou malveillante, y compris en mentant.
- term: split brain
  definition: Deux nœuds se croient tous deux leader et acceptent des écritures.
visuals: []
labs:
- ddia-ch10-l04-lab-fencing-design
- ddia-ch10-l04-lab-lease-architecture-design
extra: false
xp: 50
---

## Pourquoi c'est important

Un seul leader par partition, un seul détenteur d'un verrou, un seul nom d'utilisateur par compte : ces garanties d'**unicité** reposent presque toujours sur un nœud qui « sait » qu'il est l'élu. Cette leçon montre pourquoi ce savoir est fragile, et la parade standard : le **jeton de clôture**.

## Les pauses de processus

Un leader a un **bail** (verrou avec expiration) qu'il doit renouveler avant qu'il n'expire. Une boucle typique :

```go
for {
    request := getIncomingRequest()
    // vérifier qu'il reste au moins 10 s de bail
    if lease.expiryTime - time.Now() < 10*time.Second {
        lease = lease.renew()
    }
    if lease.isValid() {
        process(request)
    }
}
```

Que peut-il mal tourner ? D'abord, on compare un `expiryTime` fixé par **une autre machine** à l'horloge **locale** : deux horloges, la dérive de la leçon précédente. Mais surtout, entre le test `isValid()` et l'appel `process()`, le thread peut être **arrêté** assez longtemps pour que le bail expire, **sans qu'il le sache**. Causes :

- **ramasse-miettes** « stop-the-world » (de quelques ms à des secondes, voire des minutes sur de très gros tas) ;
- **suspension de machine virtuelle** ou migration à chaud ;
- fermeture d'un portable, **changement de contexte** et temps volé par l'hyperviseur ;
- **E/S synchrone** lente (disque réseau), **swap** et *thrashing* de la mémoire ;
- un signal SIGSTOP (Ctrl-Z) envoyé à un processus.

Le processus ne remarque rien : à son réveil, il ne se rend compte du temps écoulé qu'en relisant l'horloge, et il aura déjà agi. En multithread sur une machine, on dispose de mutex et de sémaphores pour résister à cela ; **en distribué, il n'y a pas de mémoire partagée**, donc ces outils ne se transposent pas. Les systèmes temps réel durs (avionique) garantissent des délais, mais au prix d'un débit moindre et d'un développement coûteux. Les systèmes ordinaires atténuent : traiter une pause de GC comme une **panne planifiée** (retirer le nœud de la rotation avant), ou redémarrer des processus périodiquement.

## La vérité est définie par la majorité

Un nœud ne peut pas se fier à son propre jugement. Un nœud à moitié déconnecté peut s'entendre dire par les autres qu'il est mort. Un leader qui sort d'une pause de 15 s se croit toujours leader alors que les autres en ont élu un nouveau. Beaucoup de systèmes distribués adoptent donc un **quorum** : une décision exige l'accord d'une **majorité** de nœuds (plus de la moitié). Comme il ne peut y avoir qu'une seule majorité, il ne peut y avoir deux décisions contradictoires. Pour n nœuds, la majorité est ⌊n/2⌋ + 1 : 2 sur 3, 3 sur 5.

## Le problème de « l'élu »

Un service de verrou décide qui détient le verrou d'un fichier. Le client 1 prend le verrou avec un bail, subit une pause de 15 s, son bail expire, le client 2 prend le verrou et écrit dans le fichier. Le client 1 se réveille, croit toujours avoir le verrou, et écrit à son tour : **les deux écrivent**, le fichier est corrompu. Ce scénario est arrivé pour de vrai (un bug de HBase).

## Les jetons de clôture

La solution : chaque fois que le service de verrou accorde un bail, il renvoie un **jeton de clôture**, un nombre qui **augmente à chaque octroi**. Le client doit joindre ce jeton à **chaque écriture** vers le stockage. Le stockage retient le **plus grand jeton déjà vu** et **refuse** toute écriture avec un jeton plus petit.

Reprise du scénario : le client 1 obtient le jeton 33 et se met en pause ; le client 2 obtient le jeton 34 et écrit avec 34 ; le client 1 se réveille et écrit avec 33 : le stockage a déjà vu 34, il **rejette**. La corruption est évitée.

Deux points d'attention : c'est la **ressource** qui doit vérifier le jeton (le client ne peut pas se vérifier lui-même, puisqu'il ignore qu'il est en pause) ; et si la ressource n'a pas de notion de jeton, on peut parfois en simuler un (par exemple en mettant le jeton dans le nom d'un fichier). Avec ZooKeeper, le numéro de transaction `zxid` ou la version du nœud fait office de jeton.

## Les fautes byzantines

Un jeton de clôture protège contre un nœud qui agit **par erreur**, pas contre un nœud qui **ment** délibérément. Les fautes byzantines (nœuds qui envoient de fausses informations, ou se comportent de façon arbitraire) concernent l'avionique, les cryptomonnaies ou les systèmes multi-organisations, et exigent plus des deux tiers de nœuds sains. Dans un centre de données qu'on contrôle, on suppose les nœuds honnêtes, mais on se protège des corruptions **accidentelles** : sommes de contrôle au niveau applicatif, validation des entrées, plusieurs serveurs NTP. Un bug déployé partout reste hors de portée.

## Pièges fréquents

- **Tester la validité du bail puis agir** sans que la ressource puisse refuser.
- **Faire confiance à l'horloge locale** pour savoir si le bail est valide.
- **Croire qu'un jeton protège contre un menteur** : il ne protège que contre l'oubli.
- **Un jeton non monotone** (par exemple un identifiant aléatoire) : il ne donne aucun ordre.

## À retenir

- Un processus peut être suspendu sans le savoir ; un bail vérifié avant l'action ne suffit pas.
- Les décisions importantes se prennent à la majorité, pas sur l'avis d'un seul nœud.
- Jeton de clôture : croissant, joint à chaque écriture, vérifié par la ressource qui rejette les anciens.
- Les fautes byzantines sont un autre problème ; on se contente de se protéger du hasard.
