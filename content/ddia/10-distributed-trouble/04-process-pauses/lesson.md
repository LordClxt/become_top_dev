---
id: ddia-ch10-l04
title: "Pauses de processus"
source: { chapter: 8, pages: "295-300" }
duration_min: 35
concepts:
  - id: ddia-process-pause
    label: "Un processus peut être figé longtemps à n'importe quel endroit de son code (GC, VM suspendue, swap, E/S synchrones, SIGSTOP)"
  - id: ddia-lease-check-race
    label: "Vérifier un bail puis agir est une course : une pause entre les deux laisse agir un nœud qui n'a plus le droit"
  - id: ddia-realtime-guarantees
    label: "Les systèmes temps réel stricts garantissent des délais au prix de lourdes contraintes ; un serveur ordinaire ne le fait pas"
  - id: ddia-gc-pause-mitigation
    label: "Traiter une pause de GC comme une courte panne planifiée : retirer le nœud du trafic, ou redémarrer avant la grosse collecte"
glossary:
  - term: "bail (lease)"
    definition: "Un verrou avec date d'expiration : son détenteur a un droit exclusif jusqu'à l'échéance, puis doit le renouveler."
  - term: "pause stop-the-world"
    definition: "Pause du ramasse-miettes pendant laquelle tous les threads de l'application sont arrêtés."
  - term: "migration à chaud (live migration)"
    definition: "Déplacement d'une machine virtuelle en marche vers un autre hôte ; elle est suspendue un moment pendant la copie."
  - term: "temps volé (steal time)"
    definition: "Temps pendant lequel une VM était prête à tourner mais l'hyperviseur donnait le CPU à une autre VM."
  - term: "swap (pagination)"
    definition: "Déplacement de pages mémoire vers le disque quand la RAM manque ; un accès mémoire peut alors attendre une lecture disque."
  - term: "temps réel strict (hard real-time)"
    definition: "Système qui garantit qu'une réponse arrive avant une échéance précise, sous peine de défaillance (airbag, commandes de vol)."
visuals: []
labs: [ddia-ch10-l04-lab-gc-drain-design]
xp: 40
---

## Pourquoi c'est important

Tu as vu que le réseau retarde les messages et que les horloges dérivent. Il reste un dernier imprévu, le plus déroutant : **ton propre programme peut s'arrêter** sans le savoir. Un thread exécute une ligne, puis la suivante 15 secondes plus tard, sans s'en apercevoir. Pendant ce temps, le reste du monde a avancé. Les bugs qui en découlent sont rares, catastrophiques et quasi impossibles à reproduire. Cette leçon explique pourquoi cela arrive et comment écrire du code qui reste correct malgré tout.

## Le bail qui expire sans prévenir

Prends une base de données avec un leader par partition (ch05). Comment un nœud sait-il qu'il est **encore** le leader et peut accepter des écritures ? Une solution courante : il obtient un **bail** (*lease*) des autres nœuds. Un bail est un verrou avec une échéance : un seul nœud le détient à la fois, et il doit le **renouveler** avant l'expiration. S'il tombe, il cesse de renouveler, le bail expire, et un autre nœud prend la place.

La boucle de traitement ressemble à ceci :

```go
for {
	req := nextRequest()
	// Renouveler si le bail expire dans moins de 10 s.
	if time.Until(lease.Expiry) < 10*time.Second {
		lease = lease.Renew()
	}
	if lease.IsValid() {
		process(req)
	}
}
```

Deux problèmes. D'abord, l'échéance a été fixée **par une autre machine** (celle qui a accordé le bail) et elle est comparée à l'**horloge locale** : si les horloges sont décalées de quelques secondes, le code fait des choses étranges. Même en ne s'appuyant que sur l'horloge monotone locale, il reste un problème bien plus profond : le code suppose que **très peu de temps s'écoule** entre la vérification `lease.IsValid()` et l'appel `process(req)`. Typiquement quelques microsecondes. Et si le thread s'arrête **15 secondes** pile entre les deux ? Le bail a expiré, un autre nœud est devenu leader, et ce thread, qui se réveille sans rien savoir, **traite la requête comme s'il était toujours leader**. Deux leaders écrivent en même temps : corruption.

## Pourquoi un thread s'arrêterait-il 15 secondes ?

Cela paraît absurde, et pourtant les causes ne manquent pas :

- **Le ramasse-miettes (GC)**. Beaucoup de runtimes (JVM notamment) ont des pauses *stop-the-world* qui arrêtent tous les threads. Elles ont déjà duré **plusieurs minutes** dans des cas extrêmes. Les collecteurs concurrents réduisent ces pauses sans les supprimer.
- **La virtualisation**. Une VM peut être **suspendue** (toute sa mémoire sauvegardée) puis reprise, par exemple lors d'une **migration à chaud** vers un autre hôte. La durée dépend de la vitesse à laquelle les processus modifient la mémoire.
- **Le partage du CPU**. L'OS peut passer la main à un autre thread, l'hyperviseur à une autre VM (on parle de **temps volé**). Sur une machine chargée, un thread peut attendre longtemps son tour.
- **Les ordinateurs portables** : l'utilisateur ferme le capot, l'exécution s'arrête.
- **Les E/S synchrones** : un accès disque bloque le thread. Il peut être caché, par exemple quand le chargeur de classes Java lit un fichier au premier usage d'une classe. Si le « disque » est en fait un volume réseau (comme EBS d'Amazon), sa latence est celle du réseau.
- **Le swap** : si l'OS pagine la mémoire sur disque, un simple accès mémoire peut provoquer une lecture disque. Sous forte pression, le système passe plus de temps à paginer qu'à travailler (*thrashing*). Beaucoup d'équipes désactivent le swap sur les serveurs et préfèrent qu'un processus soit tué faute de mémoire.
- **Les signaux** : un `SIGSTOP` (par exemple un Ctrl-Z, éventuellement envoyé par erreur par un opérateur) fige le processus jusqu'au `SIGCONT`.

Toutes ces pauses peuvent **interrompre le thread n'importe où**, même au milieu d'une fonction, puis le reprendre sans qu'il ait le moindre moyen de s'en rendre compte. Le reste du système, lui, a continué : il a peut-être déclaré le nœud mort.

C'est la même difficulté que rendre du code multithread sûr sur une machine, sauf qu'on n'a **aucun des outils habituels** : pas de mutex, de sémaphore ni de compteur atomique en mémoire partagée, puisqu'il n'y a pas de mémoire partagée, seulement des messages sur un réseau peu fiable. La règle à retenir :

> Un nœud d'un système distribué doit supposer que son exécution peut être suspendue pendant un temps significatif, à n'importe quel moment, même au milieu d'une fonction.

Ta propre lecture de l'horloge peut être périmée au moment où tu l'utilises. La leçon suivante montre comment s'en protéger côté **serveur** (jetons de clôture).

## Peut-on garantir un temps de réponse ?

Certains logiciels **doivent** répondre avant une échéance : les commandes de vol d'un avion, une fusée, un robot industriel, l'airbag d'une voiture (qui ne peut pas attendre la fin d'un GC). Ce sont des systèmes **temps réel strict**. Ils utilisent :

- un **système d'exploitation temps réel** (RTOS), qui garantit à chaque processus une part de CPU dans des intervalles précis ;
- des bibliothèques dont le **pire temps d'exécution** est documenté ;
- une allocation mémoire dynamique **restreinte ou interdite** (des GC temps réel existent, mais l'application ne doit pas trop leur demander) ;
- énormément de **tests et de mesures**.

Ce n'est pas gratuit, et cela ne veut pas dire « rapide » : ces systèmes ont souvent un **débit plus faible**, car ils privilégient les réponses à temps sur tout le reste. Sur le web, « temps réel » désigne quelque chose de bien plus flou (des mises à jour poussées au navigateur). Pour la plupart des serveurs, les garanties temps réel strict ne sont tout simplement **pas rentables**. Ces systèmes doivent donc vivre avec les pauses.

## Limiter l'impact du ramasse-miettes

On ne peut pas supprimer les pauses, mais on peut **les prévoir** et en limiter les effets. Deux idées décrites dans le livre :

1. **Traiter le GC comme une courte panne planifiée.** Le runtime prévient l'application qu'une pause GC approche. L'application **cesse d'envoyer de nouvelles requêtes** à ce nœud (le répartiteur de charge le retire), attend que les requêtes en cours se terminent, puis déclenche le GC pendant que le nœud ne sert personne. Les clients ne voient pas la pause et les percentiles élevés baissent. Certaines plateformes de trading à faible latence fonctionnent ainsi.
2. **N'utiliser le GC que pour les objets à courte vie**, rapides à collecter, et **redémarrer** périodiquement le processus avant qu'il n'accumule assez d'objets à longue vie pour exiger une collecte complète. On redémarre un nœud à la fois, après lui avoir retiré le trafic, exactement comme une mise à jour progressive (ch04).

Exemple chiffré : un service tourne sur 6 nœuds à 50 % de charge. Retirer un nœud pour son GC répartit sa charge sur 5 nœuds, qui passent à 60 %. C'est acceptable. Avec seulement 2 nœuds à 50 %, retirer l'un pousse l'autre à 100 % : cette technique demande de la marge.

> **Aller plus loin.** Le runtime Go utilise un collecteur concurrent dont les pauses *stop-the-world* sont en général sous la milliseconde ; mais l'assistance de GC (les goroutines qui allouent aident à collecter) peut ralentir fortement l'application quand le tas grossit vite, et `GOMEMLIMIT` peut déclencher des collectes en rafale près de la limite. Les JVM modernes (ZGC, Shenandoah) visent aussi des pauses de l'ordre de la milliseconde. Ces progrès réduisent la fréquence du problème, pas sa possibilité : une VM migrée ou un swap restent des pauses longues.

## Pièges fréquents

- **Vérifier une condition temporelle puis agir** (« le bail est valide, donc j'écris ») en supposant qu'aucun temps ne passe entre les deux.
- **Comparer une échéance fixée par une autre machine à l'horloge locale.**
- **Croire que « mon langage n'a pas de GC » protège des pauses** : VM, swap, E/S et ordonnanceur en causent aussi.
- **Laisser le swap activé sur un serveur de base de données** au nom de la robustesse.
- **Confondre temps réel strict et haute performance.**

## À retenir

- Un thread peut être figé n'importe où, pendant des secondes voire des minutes : GC, VM suspendue, CPU volé, E/S synchrones, swap, SIGSTOP.
- « Vérifier le bail puis agir » est une course : une pause entre les deux fait agir un leader déchu.
- Le temps réel strict garantit des délais au prix de lourdes contraintes et d'un débit plus faible ; les serveurs ordinaires ne le font pas.
- On limite l'effet du GC en le traitant comme une panne planifiée (retirer le nœud du trafic) ou en redémarrant les processus avant la grosse collecte.
