---
id: ddia-ch09-l04
title: Sérialisabilité par instantané (SSI)
source:
  chapter: 7
  pages: 261-266
duration_min: 45
concepts:
- id: ddia-ssi
  label: 'SSI : sérialisabilité complète avec un surcoût faible par rapport à l''instantané ; PostgreSQL ≥ 9.1, FoundationDB'
- id: ddia-optimistic-pessimistic
  label: 2PL est pessimiste (attendre), SSI est optimiste (continuer puis vérifier à la validation) ; l'optimisme souffre sous forte contention
- id: ddia-outdated-premise
  label: 'Écrire sur la foi d''une prémisse périmée : le write skew vient d''une décision fondée sur un résultat qui a changé'
- id: ddia-stale-mvcc-read
  label: 'Détecter les lectures MVCC périmées : suivre les écritures ignorées et vérifier à la validation si elles ont été validées'
- id: ddia-write-affects-read
  label: 'Détecter les écritures qui affectent des lectures : un tripwire sur l''index informe sans bloquer'
- id: ddia-ssi-performance
  label: 'SSI : lecteurs et écrivains ne se bloquent pas ; latence prévisible ; sensible à la durée des transactions lecture-écriture'
glossary:
- term: contrôle de concurrence pessimiste
  definition: Au moindre risque (un verrou détenu), on attend que la situation soit sûre.
- term: contrôle de concurrence optimiste
  definition: On continue malgré le risque ; à la validation, on vérifie et on annule si l'isolation a été violée.
- term: prémisse
  definition: Un fait vrai au début de la transaction (« deux médecins sont de garde ») sur lequel repose une décision.
- term: tripwire
  definition: Un verrou qui n'arrête personne mais prévient que des données lues ont peut-être changé.
visuals: []
labs:
- ddia-ch09-l04-lab-ssi-design
extra: false
xp: 45
---

## Pourquoi c'est important

Le tableau est sombre : d'un côté des implémentations de la sérialisabilité qui ne performent pas bien (2PL) ou ne passent pas à l'échelle (exécution série) ; de l'autre des niveaux faibles rapides mais exposés à des conditions de course. La sérialisabilité et la bonne performance sont-elles fondamentalement incompatibles ? Peut-être pas : un algorithme, la **sérialisabilité par instantané** (*serializable snapshot isolation*, **SSI**), est très prometteur. Il offre une **sérialisabilité complète** avec seulement une **petite pénalité de performance** par rapport à l'isolation par instantané. Décrit en 2008, il est utilisé dans PostgreSQL (niveau serializable depuis la version 9.1) et dans une base distribuée comme FoundationDB (algorithme similaire). Il est encore jeune, mais pourrait devenir le nouveau défaut.

## Pessimiste contre optimiste

**2PL est pessimiste** : si quelque chose peut mal tourner (un verrou détenu par une autre transaction), mieux vaut attendre que la situation soit sûre. C'est comme l'exclusion mutuelle en programmation multi-thread. L'exécution en série est le pessimisme à l'extrême : chaque transaction a l'équivalent d'un verrou exclusif sur toute la base (ou une partition) ; on compense en la rendant très rapide.

**SSI est optimiste** : au lieu de bloquer quand il se passe quelque chose de potentiellement dangereux, les transactions **continuent quand même**, en espérant que tout se passera bien. À la validation, la base vérifie si quelque chose de mal s'est produit (l'isolation a-t-elle été violée ?). Si oui, la transaction est **annulée** et doit être réessayée. Seules les transactions exécutées de façon sérialisable sont validées.

Le contrôle optimiste est une vieille idée. Il se comporte mal en cas de **forte contention** (beaucoup de transactions sur les mêmes objets) : une grande proportion d'annulations, et si le système est proche de sa capacité maximale, la charge supplémentaire des reprises peut empirer. Mais s'il reste de la capacité et que la contention n'est pas trop forte, l'optimiste fait mieux que le pessimiste. On peut réduire la contention par des **opérations atomiques commutatives** : si plusieurs transactions incrémentent un compteur, l'ordre n'a pas d'importance (tant qu'il n'est pas lu dans la même transaction), donc les incréments concurrents ne sont pas en conflit.

SSI est fondé sur l'isolation par instantané : toutes les lectures d'une transaction viennent d'un instantané cohérent. C'est la principale différence avec les premières techniques optimistes. Par-dessus, SSI ajoute un algorithme qui **détecte les conflits de sérialisation** entre écritures et décide quelles transactions annuler.

## Décisions fondées sur une prémisse périmée

Dans le write skew, un schéma revient : une transaction **lit** des données, examine le résultat et **décide** d'agir (écrire) selon ce qu'elle a vu. Mais sous isolation par instantané, le résultat de la requête d'origine peut ne plus être à jour au moment de la validation. La transaction agit sur une **prémisse** : un fait vrai au début (« il y a deux médecins de garde »). Plus tard, à la validation, les données ont peut-être changé et la prémisse n'est plus vraie.

Quand l'application fait une requête, la base ne sait pas comment le résultat sera utilisé. Pour être sûre, elle doit supposer que **tout changement du résultat de la requête (la prémisse) peut invalider les écritures** de la transaction : il peut y avoir une dépendance causale entre les lectures et les écritures. Pour offrir la sérialisabilité, la base doit **détecter les situations où une transaction a agi sur une prémisse périmée** et l'annuler. Comment savoir si un résultat a pu changer ? Deux cas :

1. détecter les **lectures d'une version MVCC périmée** (une écriture non validée a eu lieu avant la lecture) ;
2. détecter les **écritures qui affectent des lectures antérieures** (l'écriture a lieu après la lecture).

### Détecter les lectures périmées

Avec MVCC, une transaction qui lit un instantané **ignore** les écritures de toute transaction pas encore validée au moment de l'instantané. Exemple : la transaction 43 voit Alice de garde car la 42 (qui l'a modifiée) n'est pas validée. Mais quand la 43 veut valider, la 42 a déjà validé : l'écriture ignorée a pris effet, et la prémisse de la 43 n'est plus vraie.

Pour l'éviter, la base doit **suivre les moments où une transaction ignore les écritures d'une autre** à cause des règles de visibilité. À la validation, elle vérifie si une des écritures ignorées a maintenant été validée : si oui, la transaction est annulée.

Pourquoi attendre la validation ? Pourquoi ne pas annuler tout de suite ? Parce que si la 43 est en lecture seule, il n'y a pas de risque de write skew et elle n'a pas besoin d'être annulée. Au moment de la lecture, la base ne sait pas si la transaction va écrire. De plus, la 42 peut encore être annulée ou rester non validée, auquel cas la lecture n'était peut-être pas périmée. En évitant les annulations inutiles, SSI **préserve le support des longues lectures sur un instantané cohérent**.

### Détecter les écritures qui affectent des lectures

Second cas : une autre transaction modifie des données **après** qu'elles ont été lues. On utilise une technique similaire aux verrous d'intervalle d'index de 2PL, sauf que **les verrous de SSI ne bloquent personne**. Si les transactions 42 et 43 cherchent toutes deux les médecins de garde du créneau 1234, et qu'il y a un index sur `shift_id`, la base utilise l'entrée d'index 1234 pour enregistrer que les deux ont lu ces données (sans index, l'information se suit au niveau de la table). Cette information n'est conservée que quelque temps : quand une transaction est terminée et que toutes les concurrentes aussi, la base peut oublier ce qu'elle avait lu.

Quand une transaction écrit, elle cherche dans les index les autres transactions qui ont récemment lu les données concernées. C'est semblable à un verrou d'écriture sur la plage de clés, mais au lieu de bloquer jusqu'à la validation des lecteurs, le verrou joue le rôle de **tripwire** : il prévient simplement les transactions que ce qu'elles ont lu a peut-être changé. Dans l'exemple, la 43 prévient la 42 que sa lecture est périmée, et inversement. La 42 valide d'abord, avec succès : même si l'écriture de la 43 l'affecte, la 43 n'a pas validé, donc l'écriture n'a pas encore pris effet. Mais quand la 43 veut valider, l'écriture conflictuelle de la 42 est déjà validée : **la 43 doit être annulée**.


## La performance de SSI

Beaucoup de détails d'ingénierie comptent, notamment la **granularité** du suivi des lectures et écritures : un suivi détaillé donne des annulations précises mais un surcoût important ; un suivi grossier est plus rapide mais annule plus de transactions que nécessaire. PostgreSQL exploite le fait qu'il est parfois acceptable de lire une information écrasée par une autre transaction (on peut prouver que le résultat reste sérialisable) pour réduire les annulations inutiles.

Face à 2PL, le grand avantage de SSI est qu'**une transaction n'attend pas les verrous d'une autre** : comme avec l'instantané, les écrivains ne bloquent pas les lecteurs et inversement. La latence des requêtes est bien plus prévisible, et les requêtes en lecture seule s'exécutent sur un instantané cohérent sans verrou, très appréciable pour les charges de lecture. Face à l'exécution en série, SSI n'est **pas limité à un cœur** : FoundationDB répartit la détection de conflits sur plusieurs machines et monte à de très hauts débits, avec des transactions sur plusieurs partitions.

Le taux d'**annulations** affecte beaucoup la performance globale : une transaction qui lit et écrit pendant longtemps risque des conflits, donc SSI veut des transactions lecture-écriture assez courtes (de longues transactions en lecture seule peuvent convenir). SSI est probablement moins sensible aux transactions lentes que 2PL ou l'exécution en série.

## Pièges fréquents

- **Croire que SSI ne coûte rien** : les annulations et le suivi des lectures ont un prix.
- **Des transactions lecture-écriture longues** : forte probabilité de conflit.
- **Oublier de réessayer** : en SSI, une annulation à la validation est normale.
- **Une forte contention sur une seule clé** : à traiter par des opérations commutatives.

## À retenir

- SSI = instantané + détection de prémisses périmées (lectures MVCC ignorées, écritures sur des lectures) ; optimiste, annule à la validation.
- Ne bloque pas : latence prévisible, lectures seules sans coût d'annulation.
- Sous forte contention, beaucoup d'annulations ; transactions lecture-écriture courtes.
