---
id: ddia-ch06-l05
title: Limites des quorums, quorums relâchés et hinted handoff
source:
  chapter: 5
  pages: 181-184
duration_min: 40
concepts:
- id: ddia-quorum-limits
  label: Même avec w + r > n, des cas limites renvoient des valeurs périmées ; r et w ajustent une probabilité, pas une garantie
- id: ddia-staleness-monitoring
  label: Mesurer le retard est facile en mono-leader (positions du log), difficile sans leader
- id: ddia-sloppy-quorum
  label: 'Quorum relâché : accepter les écritures sur des nœuds hors des n nœuds désignés quand le quorum strict est inaccessible'
- id: ddia-hinted-handoff
  label: 'Hinted handoff : le nœud de dépannage renvoie les écritures aux nœuds désignés quand ils reviennent'
- id: ddia-leaderless-multi-dc
  label: 'Sans leader en multi-datacenter : n inclut tous les sites, l''attente se limite au quorum local'
glossary:
- term: quorum relâché (sloppy quorum)
  definition: w et r réponses requis, mais pouvant venir de nœuds qui ne sont pas parmi les n « maisons » de la valeur.
- term: hinted handoff
  definition: Une fois la panne réparée, les écritures acceptées temporairement par un nœud pour un autre lui sont renvoyées.
- term: nœud désigné (home node)
  definition: L'un des n nœuds sur lesquels une valeur vit normalement.
visuals: []
labs:
- ddia-ch06-l05-lab-quorum-limits-design
- ddia-ch06-l05-lab-hinted-handoff-design
extra: false
xp: 40
---

## Pourquoi c'est important

Quand w + r > n, on s'attend à ce que chaque lecture renvoie la dernière valeur écrite, parce que l'ensemble de nœuds écrits et l'ensemble de nœuds lus se recoupent. En pratique, **ce n'est pas aussi simple**. Cette leçon liste les cas limites, puis explique comment des bases rendent les quorums plus disponibles (et moins sûrs) avec les quorums relâchés.

## Les limites de la cohérence par quorum

Choisir r et w comme des **majorités** (plus de n/2) garantit w + r > n tout en tolérant jusqu'à n/2 pannes. Mais un quorum n'est pas forcément une majorité : l'important est que les ensembles lus et écrits se recoupent en **au moins un nœud**. On peut aussi choisir w + r ≤ n : lectures et écritures partent toujours à n nœuds, mais moins de réponses suffisent. Avantage : latence plus faible et disponibilité plus haute (si de nombreux réplicas sont injoignables, on peut continuer plus longtemps). Inconvénient : plus de probabilité de lire des valeurs périmées.

Même avec w + r > n, il y a des cas limites où une valeur périmée est renvoyée :

- avec un **quorum relâché** (ci-dessous), les w écritures peuvent finir sur d'autres nœuds que les r lectures : plus de recoupement garanti ;
- si **deux écritures sont concurrentes**, on ne sait pas laquelle est la plus récente. La seule solution sûre est de les fusionner. Si on choisit un gagnant par horodatage (LWW), des écritures peuvent être perdues à cause du décalage d'horloges ;
- si une **écriture a lieu en même temps qu'une lecture**, elle peut n'apparaître que sur certains réplicas : on ne sait pas si la lecture renvoie l'ancienne ou la nouvelle valeur ;
- si une **écriture a réussi sur certains réplicas mais échoué sur d'autres** (disque plein par exemple) et au total sur moins de w réplicas, elle **n'est pas annulée** là où elle a réussi. Une lecture ultérieure peut ou non renvoyer cette valeur, bien que l'écriture ait été déclarée en échec ;
- si un nœud qui portait la nouvelle valeur tombe et est **restauré à partir d'une copie ancienne**, le nombre de réplicas avec la nouvelle valeur peut tomber sous w et casser la condition de quorum ;
- même quand tout fonctionne, une question de **timing** peut jouer des tours (on y reviendra avec la linéarisabilité, module 11).

Bref : les quorums semblent garantir la dernière valeur, mais **ce n'est pas si simple**. Les bases Dynamo-style sont optimisées pour des cas d'usage qui tolèrent la cohérence à terme. Les paramètres w et r ajustent la **probabilité** de lire une valeur périmée ; il vaut mieux ne pas les prendre pour des garanties absolues. En particulier, on n'obtient en général **pas** les garanties du module précédent (lire ses écritures, lectures monotones, préfixe cohérent). Des garanties plus fortes exigent des transactions ou du consensus (modules 08 et 12).

### Surveiller le retard

En exploitation, il est important de savoir si la base renvoie des résultats à jour, même si l'application tolère les valeurs périmées. Avec un leader, les métriques de retard sont faciles : écritures appliquées dans le même ordre partout, donc la différence des positions dans le log donne le retard. **Sans leader, il n'y a pas d'ordre fixe d'application**, ce qui rend la mesure plus difficile. Et si la base n'utilise que la réparation à la lecture (sans anti-entropie), **rien ne borne l'âge d'une valeur** : une clé rarement lue peut être très ancienne sur un réplica en retard. Des recherches proposent de prédire le pourcentage de lectures périmées en fonction de n, w et r ; ce n'est pas encore courant. « À terme » est volontairement vague, mais pour l'exploitation il faut pouvoir **quantifier** « à terme ».

## Quorums relâchés et hinted handoff

Des quorums bien configurés tolèrent la panne de nœuds sans failover, et la lenteur de nœuds (les requêtes n'attendent que w ou r réponses). Ça rend ces bases attrayantes pour la haute disponibilité et la faible latence, avec tolérance aux valeurs périmées occasionnelles.

Mais les quorums ne sont pas aussi tolérants qu'ils pourraient l'être : une coupure réseau peut couper un client de beaucoup de nœuds. Ces nœuds sont vivants, d'autres clients peuvent les joindre, mais pour le client coupé ils sont morts. Il est probable qu'il reste moins de w ou r nœuds joignables, donc plus de quorum. Dans un grand cluster (nettement plus de n nœuds), le client peut quand même joindre **certains** nœuds, mais pas ceux qui forment le quorum de cette valeur. Compromis :

- renvoyer des erreurs pour toutes les requêtes dont on ne peut pas atteindre w ou r nœuds désignés ?
- ou **accepter quand même les écritures** sur des nœuds joignables qui ne font pas partie des n nœuds « maison » de la valeur ?

La seconde option est le **quorum relâché** (*sloppy quorum*) : w et r réponses sont toujours requis, mais elles peuvent venir de nœuds qui ne sont pas parmi les n désignés. Par analogie : si tu es enfermé dehors, tu frappes chez le voisin pour dormir sur son canapé. Quand la panne est réparée, les écritures acceptées temporairement par un nœud pour un autre sont renvoyées aux nœuds d'origine : c'est le **hinted handoff** (« quand tu retrouves ta clé, ton voisin te demande poliment de quitter son canapé »).

Les quorums relâchés augmentent la **disponibilité en écriture** : tant que w nœuds sont joignables, la base accepte les écritures. Mais **même avec w + r > n, tu ne peux pas être sûr de lire la dernière valeur**, car elle a pu être écrite temporairement hors des n nœuds désignés. **Un quorum relâché n'est donc pas un quorum au sens traditionnel** : c'est seulement une assurance de **durabilité** (la donnée est quelque part sur w nœuds). Rien ne garantit qu'une lecture sur r nœuds la verra tant que le hinted handoff n'est pas terminé. Les quorums relâchés sont optionnels dans les implémentations Dynamo : activés par défaut dans Riak, désactivés par défaut dans Cassandra et Voldemort.

### Multi-datacenter

L'architecture sans leader convient aussi au multi-datacenter : elle est conçue pour tolérer écritures concurrentes en conflit, coupures réseau et pics de latence. Cassandra et Voldemort le gèrent dans le modèle normal : n inclut les nœuds de **tous** les datacenters, et la configuration dit combien de réplicas par site. Chaque écriture est envoyée à tous les réplicas, mais le client n'attend que le **quorum de son datacenter local**, pour ne pas subir les délais du lien entre sites. Les écritures vers les autres sites sont souvent asynchrones. Riak, lui, garde toute la communication client–base dans un datacenter (n = réplicas locaux) et réplique entre clusters en arrière-plan, dans un style proche du multi-leader.


## Pièges fréquents

- **Dire « w + r > n donc cohérent »** : ni avec un quorum relâché, ni avec des écritures concurrentes.
- **Activer le quorum relâché sans comprendre** qu'il dégrade la lecture fraîche.
- **Ne pas surveiller le retard** sous prétexte que la base est « à terme ».
- **Restaurer un nœud depuis une vieille sauvegarde** sans réfléchir au nombre de copies de la dernière écriture.

## À retenir

- Un quorum donne une probabilité, pas une garantie : sloppy quorum, écritures concurrentes, échec partiel, restauration, timing.
- Mesurer le retard est facile avec un leader (positions du log), difficile sans.
- Quorum relâché + hinted handoff : plus de disponibilité en écriture, au prix de la fraîcheur.
- Multi-datacenter sans leader : n couvre tous les sites ; on attend le quorum local.
