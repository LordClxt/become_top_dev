---
id: ddia-ch10-l02
title: 'Détecter une panne : délais d''attente et files d''attente'
source:
  chapter: 8
  pages: 281-291
duration_min: 45
concepts:
- id: ddia-fault-detection
  label: 'Détecter une panne : signaux partiels (RST/FIN, supervision, ICMP) utiles mais jamais suffisants ; seule une réponse positive de l''application
    prouve qu''une requête a réussi'
- id: ddia-timeout-choice
  label: 'Choix d''un timeout : trop long = attente, trop court = faux positifs qui doublent le travail et peuvent déclencher une cascade'
- id: ddia-unbounded-delay
  label: 'Délais non bornés : un délai maximal garanti d (donc 2d + r) n''existe pas en réseau asynchrone'
- id: ddia-queueing
  label: Les files d'attente (commutateurs, CPU, VM, contrôle de flux TCP, retransmission) créent la variabilité des délais ; voisins bruyants
    dans le cloud
- id: ddia-adaptive-timeout
  label: 'Timeouts adaptatifs : mesurer la distribution des délais (Phi Accrual) plutôt que fixer une constante'
- id: ddia-sync-vs-packet
  label: 'Circuit synchrone (latence bornée, ressources réservées) contre paquets (rafales, utilisation élevée) : la variabilité est un compromis
    de coût, pas une loi de la nature'
glossary:
- term: timeout
  definition: Durée d'attente au bout de laquelle on décide qu'une requête a échoué.
- term: faux positif
  definition: Nœud déclaré mort alors qu'il est seulement lent.
- term: Phi Accrual
  definition: Détecteur de pannes qui produit un niveau de soupçon continu à partir de la distribution mesurée des intervalles de battements de
    cœur.
- term: défaillance en cascade
  definition: Le transfert de charge d'un nœud déclaré mort surcharge les autres, qui sont à leur tour déclarés morts.
visuals: []
labs:
- ddia-ch10-l02-lab-timeout-design
extra: false
xp: 45
---

## Pourquoi c'est important

La phrase « le serveur est mort » est une **hypothèse** que ton système fabrique à partir d'un silence. Si l'hypothèse est trop rapide, tu déclares morts des nœuds vivants ; si elle est trop lente, les utilisateurs attendent devant une page blanche. Ce choix, un simple nombre de millisecondes, détermine la disponibilité de bien des systèmes.

## Détecter une panne

Beaucoup de systèmes doivent détecter les nœuds défaillants : un répartiteur de charge retire un serveur de la rotation, une base à leader promeut un suiveur quand le leader meurt.

Quelques signaux existent. Si le processus est mort mais que l'OS tourne, il **ferme ou réinitialise les connexions TCP** (paquets RST ou FIN). Un script peut prévenir les autres nœuds d'un crash. L'interface d'administration d'un commutateur peut dire qu'un lien est coupé. Un routeur peut répondre « destination injoignable » (ICMP).

Ces signaux sont **utiles mais jamais suffisants** : ils ne marchent que dans certains cas de panne. Pour savoir si une requête a réussi, il n'y a qu'une preuve : la **réponse positive de l'application**. Dans le doute, on réessaie quelques fois, puis on abandonne par un **délai d'attente**.

## Quel timeout choisir ?

Il n'y a pas de bonne valeur universelle :

- **trop long** : on met longtemps à reconnaître la panne, les utilisateurs attendent ou voient des erreurs ;
- **trop court** : on déclare mort un nœud qui est seulement **lent** (pic de charge, pause, congestion). Ce **faux positif** est coûteux : si le nœud a en fait traité l'action, elle sera **exécutée deux fois** quand un autre nœud la reprend. Et le transfert de charge sur les autres, déjà chargés, peut les rendre lents à leur tour : c'est la **défaillance en cascade**.

Si le réseau garantissait un délai maximal *d* pour la livraison et un temps de traitement maximal *r* pour un nœud vivant, un timeout de **2d + r** serait exact. Hélas, aucun de ces deux nombres n'existe en réseau asynchrone ni en serveur ordinaire.

## Pourquoi les délais varient autant : les files

La variabilité du délai vient presque toujours de **files d'attente** :

- **dans le réseau**, plusieurs nœuds envoient vers la même destination : le commutateur met les paquets en file et les envoie un par un ; si la file déborde, il les **jette**, et on retransmet ;
- **dans le système d'exploitation**, si tous les cœurs sont occupés, la requête entrante attend sa tranche de CPU ; en machine virtuelle, le processeur est suspendu quelques dizaines de millisecondes pendant qu'une autre VM tourne ;
- **dans TCP**, le contrôle de flux limite le débit de l'émetteur, ce qui crée une file supplémentaire côté expéditeur ; et la retransmission après perte ajoute un délai de plus ;
- **dans le cloud**, les ressources sont partagées : un **voisin bruyant** sur la même machine saturera le réseau ou le disque et dégradera tes délais.

Pour les données sensibles au retard (voix, vidéo), on préfère souvent UDP, qui ne retransmet pas : une donnée en retard est inutile.

> Au-delà du livre : en théorie des files, plus l'utilisation d'une ressource approche de 100 %, plus la file attendue **explose** (de l'ordre de ρ/(1−ρ) clients en moyenne pour une file simple). À 50 % de charge, la file est courte ; à 90 %, elle est neuf fois plus grande qu'à 50 % ; à 99 %, on attend dans une file de 99. C'est la raison pour laquelle la latence aux percentiles élevés (module 00) se dégrade bien avant la saturation complète.

## Circuit synchrone ou paquets ?

Le réseau téléphonique traditionnel est **synchrone** : un appel réserve un circuit de capacité fixe sur tout le chemin, quelques centaines de bits toutes les 250 µs. Pas de file, donc délai **borné**. Les réseaux de données utilisent la **commutation de paquets**, qui optimise le trafic en **rafales** : une page web ou un transfert de fichier n'a pas de débit constant, il prend ce qui est disponible. Réserver un circuit gaspillerait la capacité.

Le compromis est économique : en partageant dynamiquement les ressources, on obtient une meilleure utilisation (donc un coût plus bas) au prix de **délais variables**. Ce n'est pas une loi de la nature : des architectures à qualité de service existent, mais elles coûtent plus cher et ne sont pas disponibles dans la plupart des environnements. On doit donc **supposer des délais non bornés** et concevoir avec.

## Timeouts adaptatifs

Plutôt que de fixer le délai à une constante, on **mesure** la distribution des temps de réponse (ou des intervalles entre battements de cœur) sur une fenêtre récente et on dérive le seuil : par exemple la moyenne plus *k* écarts-types. Le **détecteur Phi Accrual**, utilisé notamment par Akka et Cassandra, fait cela et renvoie un **niveau de soupçon** plutôt qu'un oui/non : l'application décide à partir de quel niveau agir. C'est ce que tu coderas dans le projet Tinybase.

## Pièges fréquents

- **Un timeout figé** copié d'une autre application : adapté à un autre réseau, une autre charge.
- **Réessayer immédiatement et en boucle** : on aggrave la surcharge (voir les ré-essais avec attente exponentielle).
- **Déclarer mort ce qui est lent** puis réexécuter l'action sans idempotence.
- **Oublier que la charge fait varier le délai** : un timeout bon au creux de la nuit est trop court en pic.

## À retenir

- Seule une réponse positive de l'application prouve le succès ; les autres signaux sont des indices.
- Timeout trop court : faux positifs, doublons, cascade ; trop long : attente.
- Les délais variables viennent des files ; la commutation de paquets échange borne contre utilisation.
- Mesurer la distribution et adapter le seuil (Phi Accrual) vaut mieux qu'une constante.
