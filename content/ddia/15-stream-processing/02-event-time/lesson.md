---
id: ddia-ch15-l02
title: "Raisonner sur le temps : événement contre traitement"
source: { chapter: 11, pages: "468-472" }
duration_min: 35
concepts:
  - id: ddia-sp-event-vs-processing-time
    label: "Temps de l'événement (quand c'est arrivé) contre temps de traitement (quand le job le voit) : seul le premier rend le résultat déterministe"
  - id: ddia-sp-processing-lag-artifacts
    label: "Fenêtrer en temps de traitement crée des artefacts : un redémarrage avec arriéré fait apparaître un faux pic"
  - id: ddia-sp-stragglers
    label: "Retardataires : on ne sait jamais si tout est arrivé ; on les ignore (et on les compte) ou on publie une correction"
  - id: ddia-sp-watermark
    label: "Watermark : message « plus rien d'antérieur à t » qui déclenche la fermeture des fenêtres ; à suivre par producteur"
  - id: ddia-sp-three-timestamps
    label: "Trois horodatages (événement et envoi selon l'appareil, réception selon le serveur) pour estimer et corriger le décalage d'horloge"
glossary:
  - term: "temps de l'événement (event time)"
    definition: "L'instant où l'événement s'est produit, tel qu'enregistré dans l'événement lui-même."
  - term: "temps de traitement (processing time)"
    definition: "L'instant où l'opérateur traite l'événement, lu sur l'horloge locale de la machine qui l'exécute."
  - term: "retardataire (straggler)"
    definition: "Événement qui arrive après que sa fenêtre a été considérée comme terminée."
  - term: "watermark (filigrane)"
    definition: "Indication qu'aucun événement d'horodatage antérieur à t n'arrivera plus ; le terme vient des frameworks modernes, l'idée est dans le livre."
  - term: "décalage d'horloge (clock offset)"
    definition: "Différence entre l'horloge d'un appareil et une horloge de référence, estimée par différence de deux horodatages."
visuals: []
labs: [ddia-ch15-l02-lab-clock-design]
xp: 40
---

## Pourquoi c'est important

« Combien de commandes par minute ? » paraît simple. Mais **quelle** minute : celle où le client a cliqué, ou celle où ton job a lu l'événement ? Tant que le flux arrive sans retard, les deux se confondent. Le jour où ton consommateur redémarre après 10 minutes de panne, ou où un téléphone renvoie trois heures d'événements en sortant d'un tunnel, ils divergent, et ton tableau de bord se met à mentir. Cette leçon donne les outils pour raisonner juste.

## Deux horloges

Un job **batch** (ch. 13) traite des données historiques : il regarde l'horodatage **dans** chaque événement. Exécuter le même job deux fois donne le même résultat, que la machine tourne en 2017 ou en 2026. L'horloge de la machine ne sert à rien.

Beaucoup de frameworks de flux utilisent au contraire l'**horloge locale** de la machine pour fenêtrer : c'est le **temps de traitement**. C'est simple et raisonnable **si** le délai entre la création et le traitement de l'événement est négligeable. Il ne l'est souvent pas :

- mises en file d'attente, défaillances réseau (ch. 10) ;
- contention de performance chez le broker ou le consommateur ;
- **redémarrage** d'un consommateur, qui repart de son offset avec un arriéré ;
- **retraitement** volontaire d'événements passés, pour corriger un bogue.

Pire, les délais peuvent **réordonner** les messages : l'utilisateur fait la requête A puis la requête B sur deux serveurs ; B arrive au broker avant A. Le job voit B d'abord.

Une analogie aide : les films *Star Wars*. Les épisodes IV à VI sortent en 1977, 1980 et 1983, les épisodes I à III en 1999, 2002 et 2005, le VII en 2015. Regarder dans l'ordre de sortie (temps de traitement) n'est pas regarder dans l'ordre de l'histoire (temps de l'événement). Le spectateur reconstruit l'ordre narratif ; ton job doit faire de même.

### Le faux pic

Prenons un job qui compte les requêtes par minute **en temps de traitement**. Le flux réel est stable : 1 000 requêtes par minute. Le job tombe à 10 h 00 et redémarre à 10 h 05. Il dépile alors l'arriéré : 5 000 requêtes en retard plus les 1 000 de la minute courante, toutes vues pendant la minute 10 h 05. Le tableau affiche zéro pendant cinq minutes, puis **6 000** : un pic qui n'a jamais existé. En temps de l'événement, chaque requête retourne dans sa vraie minute et la courbe reste plate à 1 000.

Retiens : fenêtrer en temps de traitement mesure **le comportement du pipeline**, pas celui des utilisateurs. C'est parfois ce qu'on veut (surveiller le débit du job), rarement ce qu'on croit mesurer.

## Quand une fenêtre est-elle prête ?

Fenêtrer en temps de l'événement soulève un problème neuf : **tu ne sais jamais si tu as tout reçu**. Tu comptes les événements de 10 h 37. À quel moment déclares-tu la minute terminée et publies-tu le total ? Ne plus rien voir de cette minute depuis un moment ne prouve rien : certains événements peuvent être coincés sur une machine en panne, ou dans un buffer réseau.

Il faut donc gérer les **retardataires**, ces événements qui arrivent après la fermeture de leur fenêtre. Deux options :

1. **Les ignorer.** S'ils sont rares, l'erreur est faible. Mais **suis leur nombre** comme une métrique, avec une alerte si la proportion grimpe : un taux de retardataires qui passe de 0,01 % à 5 % signale une panne en amont.
2. **Publier une correction** : une nouvelle valeur pour la fenêtre, avec ses retardataires. Le consommateur en aval doit alors savoir **remplacer** (ou retirer) la valeur précédente. C'est plus juste, mais plus exigeant pour tout le pipeline.

### Le message « plus rien avant t »

Une autre approche : le producteur envoie un message spécial disant « désormais, il n'y aura plus de message d'horodatage antérieur à t ». Les consommateurs l'utilisent pour **déclencher** la fermeture des fenêtres qui finissent avant t.

Difficulté : s'il y a **plusieurs producteurs** (plusieurs serveurs web, chacun avec sa propre horloge et son propre rythme), chacun émet son propre seuil. Le consommateur doit les suivre **un par un** et ne peut avancer que jusqu'au **minimum** : le producteur le plus lent dicte le rythme. Et ajouter ou retirer des producteurs complique encore la tenue de cette liste.

### Aller plus loin : les watermarks

Les frameworks modernes (Flink, Apache Beam, Kafka Streams) appellent ce seuil un **watermark**. La stratégie la plus courante, « désordre borné », estime le watermark comme **plus grand horodatage vu − délai maximum toléré** : avec 5 secondes de tolérance et un dernier événement à 10:37:42, le watermark vaut 10:37:37. Une fenêtre [10:37:00, 10:38:00) est émise quand le watermark atteint 10:38:00, donc quand un événement de 10:38:05 est arrivé. Tout ce qui arrive ensuite pour cette minute est retardataire : compté à part, ou injecté dans une correction si on accepte un *allowed lateness*. Le compromis est direct : un grand délai donne des résultats plus complets mais plus tardifs. Tu implémenteras exactement ce mécanisme dans le projet Tinybase.

## De quelle horloge parle-t-on ?

Pour poser un horodatage sur un événement, il faut une horloge. Cas typique : une **application mobile** enregistre des événements d'usage même **hors ligne** et les envoie au serveur quand le réseau revient, des heures voire des jours plus tard. Du point de vue du consommateur, ce sont des retardataires extrêmes.

Quelle heure croire ?

- l'**horloge de l'appareil** décrit l'instant réel de l'interaction, mais on ne peut pas s'y fier : l'utilisateur l'a peut-être réglée de travers, par erreur ou exprès (ch. 10 : les horloges dérivent et mentent) ;
- l'**horloge du serveur** est plus fiable (tu la contrôles, elle est synchronisée par NTP), mais elle dit quand l'événement a été **reçu**, ce qui a peu de sens pour décrire ce qu'a fait l'utilisateur.

La solution du livre : enregistrer **trois horodatages**.

1. l'instant de l'événement, selon l'**horloge de l'appareil** ;
2. l'instant d'**envoi** au serveur, selon l'**horloge de l'appareil** ;
3. l'instant de **réception**, selon l'**horloge du serveur**.

En soustrayant (2) de (3), on obtient le **décalage** entre l'horloge de l'appareil et celle du serveur, à condition que la durée du trajet réseau soit négligeable devant la précision voulue. On applique ce décalage à (1) pour estimer l'instant réel.

Exemple : l'appareil note un clic à 09:12:00 (1), l'envoie à 14:00:00 (2) ; le serveur le reçoit à 14:07:30 (3). Décalage = 14:07:30 − 14:00:00 = +7 min 30 s : l'horloge du téléphone retarde. Instant réel estimé = 09:12:00 + 7 min 30 s = **09:19:30**. Le clic appartient à la fenêtre de 9 h 19, pas à celle de 14 h.

Ce problème n'est pas propre au flux : un job batch sur ces mêmes journaux souffre exactement du même mal. Mais en flux, on le **remarque** davantage parce qu'on a conscience du passage du temps.

## Pièges fréquents

- **Compter par minute avec l'horloge du job** : chaque redémarrage fabrique un faux pic.
- **Ignorer les retardataires sans les compter** : une panne en amont devient invisible.
- **Faire avancer le seuil au rythme du producteur le plus rapide** : on ferme des fenêtres que le plus lent n'a pas fini de remplir.
- **Faire confiance à l'horloge de l'appareil** : corrige-la avec le décalage mesuré (3) − (2).
- **Soustraire (1) de (3)** : cela mêle le délai d'envoi (des heures hors ligne) et le décalage d'horloge.

## À retenir

- Temps de l'événement pour décrire le monde ; temps de traitement pour décrire le pipeline.
- Une fenêtre en temps de l'événement n'est jamais sûre d'être complète : retardataires ignorés (et mesurés) ou corrigés.
- Un seuil « plus rien avant t » (watermark) déclenche les fenêtres ; avec plusieurs producteurs, c'est le minimum qui compte.
- Trois horodatages : décalage = réception serveur − envoi appareil, appliqué à l'heure de l'événement.
