---
id: ddia-ch09-l03
title: "Le verrouillage à deux phases (2PL)"
source: { chapter: 7, pages: "257-259" }
duration_min: 35
concepts:
  - id: ddia-2pl-rule
    label: "2PL : les écrivains bloquent les lecteurs et les lecteurs bloquent les écrivains, jusqu'à la fin de la transaction"
  - id: ddia-2pl-shared-exclusive
    label: "Verrou partagé pour lire (compatible avec d'autres partagés), verrou exclusif pour écrire (compatible avec rien)"
  - id: ddia-2pl-lock-upgrade
    label: "Lire puis écrire : le verrou partagé monte en exclusif"
  - id: ddia-2pl-two-phases
    label: "Deux phases : on acquiert pendant la transaction, on relâche tout d'un coup au commit ou à l'abandon"
  - id: ddia-2pl-deadlock
    label: "Interblocage : un cycle d'attente que la base détecte, en abandonnant une transaction à relancer"
  - id: ddia-2pl-performance
    label: "Coût du 2PL : moins de concurrence, latences instables aux percentiles élevés, interblocages fréquents"
glossary:
  - term: "verrouillage à deux phases (two-phase locking, 2PL)"
    definition: "Algorithme de sérialisabilité où chaque transaction prend des verrous sur ce qu'elle lit et écrit et les garde jusqu'à la fin. À ne pas confondre avec le commit à deux phases (2PC)."
  - term: "verrou partagé (shared lock)"
    definition: "Verrou pris pour lire ; plusieurs transactions peuvent le détenir en même temps sur le même objet."
  - term: "verrou exclusif (exclusive lock)"
    definition: "Verrou pris pour écrire ; aucune autre transaction ne peut détenir de verrou, partagé ou exclusif, sur cet objet."
  - term: "interblocage (deadlock)"
    definition: "Situation où des transactions s'attendent mutuellement en cycle : aucune ne peut avancer sans intervention."
  - term: "graphe d'attente (wait-for graph)"
    definition: "Graphe où une flèche T1 → T2 signifie « T1 attend un verrou que détient T2 » ; un cycle signale un interblocage."
visuals: []
labs: [ddia-ch09-l03-lab-wait-for]
xp: 40
---

## Pourquoi c'est important

Pendant une trentaine d'années, il n'y a eu qu'**un** algorithme largement utilisé pour obtenir la sérialisabilité : le **verrouillage à deux phases** (*two-phase locking*, **2PL**). C'est lui que tu obtiens quand tu demandes `SERIALIZABLE` dans MySQL (InnoDB) ou SQL Server, ou le niveau *repeatable read* de DB2. Le connaître, c'est comprendre pourquoi une base « sérialisable » peut soudain voir ses latences exploser, et ce que signifie l'erreur *deadlock detected* dans tes logs.

Attention au nom : 2PL n'a **rien à voir** avec le *commit à deux phases* (2PC), qui sert à valider une transaction répartie sur plusieurs nœuds (on le verra avec le consensus). Ce sont deux mécanismes complètement différents.

## Des verrous bien plus stricts

Tu connais déjà les verrous d'écriture : même en *read committed*, deux transactions ne peuvent pas écrire le même objet en même temps. Le 2PL va beaucoup plus loin :

- Si la transaction A a **lu** un objet et que B veut l'**écrire**, B doit **attendre** que A valide ou abandonne. A ne peut pas voir l'objet changer sous ses yeux.
- Si A a **écrit** un objet et que B veut le **lire**, B doit **attendre** que A valide ou abandonne. Lire l'ancienne version, comme en snapshot isolation, n'est pas permis.

En une phrase : **les écrivains bloquent les lecteurs, et les lecteurs bloquent les écrivains.** C'est l'opposé exact du mantra de la snapshot isolation vue au chapitre précédent, où *les lecteurs ne bloquent jamais les écrivains et inversement*. C'est ce blocage qui empêche toutes les anomalies, y compris les mises à jour perdues et le *write skew*.

## Partagé ou exclusif

Concrètement, la base garde un verrou sur chaque objet, en deux modes :

- Pour **lire** un objet, la transaction prend un verrou **partagé**. Plusieurs transactions peuvent détenir un verrou partagé sur le même objet en même temps. Mais si quelqu'un détient déjà un verrou **exclusif**, il faut attendre.
- Pour **écrire** un objet, la transaction prend un verrou **exclusif**. Aucune autre transaction ne peut détenir de verrou sur cet objet, ni partagé ni exclusif : il faut attendre qu'ils soient tous libérés.
- Si une transaction **lit puis écrit** le même objet, elle fait **monter** (*upgrade*) son verrou partagé en exclusif. Cela fonctionne exactement comme prendre un exclusif directement : il faut que plus personne d'autre ne détienne de verrou.

La table de compatibilité tient en quatre cases : partagé avec partagé, oui ; toutes les autres combinaisons, non.

## Pourquoi « deux phases »

Une fois acquis, un verrou est **gardé jusqu'à la fin de la transaction**, commit ou abandon. D'où les deux phases :

1. **Pendant l'exécution**, la transaction **acquiert** des verrous, au fur et à mesure de ses lectures et écritures, sans jamais en relâcher.
2. **À la fin**, elle les **relâche tous** d'un coup.

Pourquoi ne pas relâcher le verrou de lecture dès la lecture finie ? Parce que la transaction a peut-être pris une **décision** sur la base de ce qu'elle a lu. Si un autre pouvait modifier l'objet entre-temps, on retomberait sur le *write skew* : deux médecins qui lisent chacun « il reste deux médecins de garde », puis se retirent tous les deux.

## Les interblocages

Avec autant de verrous, il arrive que des transactions s'attendent en **cycle**. Exemple : A détient un verrou sur la ligne `alice` et attend `bob` ; B détient `bob` et attend `alice`. Aucune n'avancera jamais. C'est un **interblocage** (*deadlock*).

La base le **détecte automatiquement**, typiquement en cherchant un cycle dans un **graphe d'attente** : une flèche T1 → T2 signifie « T1 attend un verrou que détient T2 ». Dès qu'un cycle apparaît, la base **abandonne** une des transactions (la victime) pour que les autres puissent avancer. Ses verrous sont libérés, les autres reprennent. La victime, elle, doit être **relancée par l'application**.

Il existe une forme d'interblocage sournoise propre à la montée de verrou : A et B lisent la même ligne (deux verrous partagés, compatibles), puis veulent toutes les deux l'écrire. Chacune attend que l'autre lâche son verrou partagé : cycle immédiat. C'est fréquent dans les motifs « lire, calculer, mettre à jour » sur une ligne populaire. D'où l'intérêt d'un `SELECT … FOR UPDATE`, qui prend directement l'exclusif.

## Le prix du 2PL

Le gros défaut du 2PL, et la raison pour laquelle tout le monde ne l'utilise pas depuis les années 1970, c'est sa **performance** : le débit et les temps de réponse sont nettement moins bons qu'avec une isolation faible.

- **Le coût des verrous eux-mêmes** : les acquérir, les relâcher, les tenir à jour.
- **Surtout, moins de concurrence** : par construction, dès que deux transactions risquent un conflit, l'une **attend** l'autre.
- **Les transactions n'ont pas de durée limite** dans une base relationnelle classique, car elles sont souvent interactives. Une seule transaction lente, ou une qui lit beaucoup de données (un rapport qui verrouille en partagé une grande table), peut **figer** toutes celles qui veulent écrire ce qu'elle a lu. Elles attendent, et celles qui les attendent attendent aussi.
- **Des latences instables** : la latence médiane peut rester correcte, mais les **percentiles élevés** (le p99 du premier chapitre) explosent dès qu'il y a de la contention.
- **Des interblocages bien plus fréquents** qu'avec un simple verrouillage d'écriture. Chaque victime est du **travail gaspillé**, à refaire ; sous forte contention, une partie notable du débit peut partir en relances.

Un exemple chiffré : si un rapport de 3 secondes lit la table `comptes` sous 2PL, chaque virement qui touche un compte lu attend jusqu'à 3 secondes. Ta latence p99 passe de 5 ms à plus de 3 000 ms, sans qu'aucune requête n'ait été plus lente que d'habitude.

## Pièges fréquents

- **Confondre 2PL et 2PC** : le premier sert à l'isolation, le second à l'atomicité d'une transaction répartie.
- **Relâcher un verrou de lecture tôt « pour gagner du temps »** : ce n'est plus du 2PL, et le *write skew* revient.
- **Lancer de longues lectures dans la même base sérialisable** que les écritures : elles bloquent les écrivains.
- **Ne pas relancer la victime d'un interblocage** : l'erreur est normale sous 2PL, l'application doit réessayer.
- **Lire puis mettre à jour une ligne populaire** dans plusieurs transactions : interblocage de montée de verrou garanti ; prends l'exclusif d'emblée.

## À retenir

- 2PL : écrivains et lecteurs se bloquent mutuellement, jusqu'à la fin de la transaction.
- Partagé pour lire (compatible avec d'autres partagés), exclusif pour écrire (compatible avec rien) ; lire puis écrire fait monter le verrou.
- Deux phases : on acquiert pendant, on relâche tout à la fin.
- Les interblocages sont détectés (cycle dans le graphe d'attente) et résolus en abandonnant une victime, à relancer.
- Prix : moins de concurrence, latences p99 instables, travail gaspillé en interblocages.
