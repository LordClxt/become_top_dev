---
id: ddia-ch10-l05
title: "Savoir, vérité et mensonges"
source: { chapter: 8, pages: "300-311" }
duration_min: 45
concepts:
  - id: ddia-truth-by-majority
    label: "Un nœud ne peut pas se fier à son propre jugement : la vérité est ce que décide un quorum majoritaire"
  - id: ddia-zombie-lock-holder
    label: "Un client qui croit encore tenir un verrou expiré (après une pause) peut corrompre la ressource"
  - id: ddia-fencing-token
    label: "Jeton de clôture : un numéro croissant à chaque attribution du verrou, que la ressource vérifie pour rejeter les jetons périmés"
  - id: ddia-byzantine-fault
    label: "Faute byzantine : un nœud ment ou envoie des messages arbitraires ; la tolérer exige plus des deux tiers de nœuds honnêtes"
  - id: ddia-system-model
    label: "Modèle de système : hypothèses de temps (synchrone, partiellement synchrone, asynchrone) et de panne (crash-stop, crash-recovery, byzantine)"
  - id: ddia-safety-liveness
    label: "Sûreté : rien de mal n'arrive jamais ; vivacité : quelque chose de bien finit par arriver"
glossary:
  - term: "quorum"
    definition: "Nombre minimal de nœuds dont le vote est nécessaire pour décider ; en général une majorité stricte (plus de la moitié)."
  - term: "jeton de clôture (fencing token)"
    definition: "Numéro strictement croissant remis avec chaque verrou ou bail ; la ressource refuse toute écriture portant un jeton plus petit qu'un jeton déjà vu."
  - term: "faute byzantine"
    definition: "Comportement arbitraire d'un nœud : il ment, envoie des messages contradictoires ou corrompus, par panne ou par malveillance."
  - term: "crash-recovery"
    definition: "Modèle où un nœud peut planter à tout moment puis redémarrer ; son stockage durable survit, sa mémoire est perdue."
  - term: "partiellement synchrone"
    definition: "Modèle où le système respecte des bornes de délai la plupart du temps, mais peut les dépasser sans limite par moments."
  - term: "sûreté (safety)"
    definition: "Propriété dont toute violation se produit à un instant précis et ne peut pas être réparée ensuite."
  - term: "vivacité (liveness)"
    definition: "Propriété qui peut ne pas être vraie à un instant donné, mais qui peut toujours le devenir plus tard (« finit par »)."
visuals: []
labs: [ddia-ch10-l05-lab-fencing-design]
xp: 40
---

## Pourquoi c'est important

Récapitulons ce que les quatre leçons précédentes ont retiré : le réseau perd et retarde les messages ; les horloges dérivent ; un processus peut être figé n'importe quand. Un nœud **ne sait donc rien avec certitude**. Il ne peut que faire des suppositions à partir des messages qu'il reçoit (ou ne reçoit pas). Comment construire quoi que ce soit de correct sur un sol aussi mouvant ? Cette leçon donne les trois réponses du livre : **décider à la majorité**, **faire vérifier les droits par la ressource elle-même** (jetons de clôture), et **raisonner dans un modèle de système** explicite, avec des propriétés de sûreté et de vivacité.

## La vérité est définie par la majorité

Trois histoires de nœuds incompris :

- Un nœud **reçoit** tous les messages mais ses messages **sortants** sont perdus (lien à sens unique, leçon 1). Il voit tout, répond à tout, et pourtant les autres, n'entendant rien, le **déclarent mort**. Il n'a aucun moyen de les contredire.
- Un nœud s'aperçoit que ses messages ne sont pas acquittés, et comprend qu'il y a une panne. Mais il ne peut rien y faire : il est déclaré mort.
- Un nœud subit une **pause GC d'une minute**. Les autres le déclarent mort et le remplacent. Il reprend son exécution comme si de rien n'était, sans savoir qu'une minute a passé.

Morale : **un nœud ne peut pas se fier à son propre jugement** sur la situation. Un système distribué ne peut pas dépendre d'un seul nœud, qui peut tomber ou être figé à tout moment. Beaucoup d'algorithmes s'appuient donc sur un **quorum** : une décision n'est valable que si un nombre minimal de nœuds la votent. Le plus souvent, une **majorité stricte** (plus de la moitié). Avec 5 nœuds, il faut 3 votes ; le système tolère donc 2 nœuds en panne. Avec 4 nœuds, il faut aussi 3 votes, et il ne tolère qu'**une** panne : un nombre pair n'apporte rien de plus.

Pourquoi la majorité ? Parce qu'**il ne peut y en avoir qu'une**. Deux majorités disjointes n'existent pas, donc deux décisions contradictoires ne peuvent pas être prises en même temps. Si un nœud est déclaré mort par un quorum, il **doit** s'effacer, même s'il se sent parfaitement vivant. On l'avait vu avec les quorums de lecture/écriture (ch06) ; on le reverra avec le consensus (ch12).

## Le leader et le verrou

Souvent, un système a besoin qu'**il n'y ait qu'un seul** de quelque chose :

- un seul **leader** par partition, pour éviter le *split brain* (ch05) ;
- un seul client qui **détient le verrou** d'une ressource, pour éviter des écritures concurrentes qui la corrompent ;
- un seul utilisateur par **nom d'utilisateur**.

Un nœud peut se croire « l'élu » (le leader, le détenteur du verrou) alors que le quorum a décidé autrement. S'il continue d'agir, le système dysfonctionne. Ce n'est pas théorique : le livre décrit un **vrai bug de HBase** de ce type. Rejouons-le :

1. Le client 1 obtient un **bail** du service de verrous pour écrire un fichier sur le stockage.
2. Le client 1 subit une **longue pause GC**. Son bail expire pendant la pause.
3. Le client 2 obtient le bail et **écrit** le fichier.
4. Le client 1 se réveille, **croit toujours détenir le bail** (il n'a pas vu le temps passer), et écrit à son tour. Le fichier est **corrompu**.

Ce client qui agit avec un droit expiré, on l'appelle parfois un **zombie**. Vérifier le bail juste avant d'écrire ne suffit pas (leçon 4) : la pause peut tomber entre la vérification et l'écriture.

## Les jetons de clôture

La solution : ne pas faire confiance au client, et laisser **la ressource** vérifier. Chaque fois que le service de verrous accorde un verrou ou un bail, il renvoie aussi un **jeton de clôture** (*fencing token*) : un nombre qui **augmente à chaque attribution**. Le client doit joindre son jeton à **chaque écriture** vers le stockage. Le stockage retient le plus grand jeton déjà vu, et **rejette toute écriture portant un jeton plus petit**.

Le même scénario, protégé :

1. Le client 1 obtient le bail avec le jeton **33**, puis se fige.
2. Le bail expire ; le client 2 l'obtient avec le jeton **34** et écrit avec 34. Le stockage retient 34.
3. Le client 1 se réveille et écrit avec **33**. Le stockage a déjà vu 34 : il **rejette** l'écriture. Le fichier est intact.

Quelques points importants :

- Le jeton doit être **strictement croissant** et attribué par un service fiable. Avec ZooKeeper, on peut utiliser l'identifiant de transaction `zxid` ou la version du nœud `cversion`, qui sont garantis croissants. Pas l'heure murale d'un client (leçon 3) !
- La vérification se fait **côté serveur**. Si la ressource ne sait pas vérifier de jeton (un simple service de fichiers), on peut parfois contourner, par exemple en mettant le jeton dans le nom du fichier. Mais il faut **une** forme de vérification côté ressource, sinon le zombie passe.
- C'est une bonne pratique générale : un service ne devrait pas supposer que ses clients se comportent toujours bien. Les clients sont gérés par d'autres gens, avec d'autres priorités.

> **Aller plus loin.** Un verrou « distribué » posé sur un **seul** Redis, ou même l'algorithme Redlock sur plusieurs Redis, ne fournit pas de jeton croissant : Kleppmann a publié une critique détaillée de Redlock sur ce point précis. Pour un verrou dont dépend la correction, préfère un service de consensus (ZooKeeper, etcd) et des jetons vérifiés par la ressource. etcd fournit pour cela la révision de la clé de verrou, croissante.

## Les fautes byzantines

Les jetons de clôture protègent contre un nœud qui se trompe **par erreur** (il ne sait pas encore que son bail a expiré). Ils ne protègent pas contre un nœud qui **ment exprès** : il suffirait d'envoyer un faux jeton immense. Jusqu'ici, ce livre suppose que les nœuds sont **non fiables mais honnêtes** : lents, muets, en retard, mais jamais menteurs.

Quand un nœud peut mentir (envoyer des messages corrompus ou contradictoires, prétendre avoir reçu un message qu'il n'a pas reçu), on parle de **faute byzantine**, d'après le problème des généraux byzantins de Lamport. Un système est **tolérant aux fautes byzantines** s'il fonctionne correctement même si certains nœuds dysfonctionnent ou sont malveillants. Cela compte :

- dans l'**aérospatial**, où les radiations peuvent corrompre la mémoire ou les registres d'un processeur, et où une panne serait catastrophique ;
- quand **plusieurs organisations** participent et que certaines pourraient tricher : réseaux pair à pair comme les chaînes de blocs (Bitcoin).

Dans un datacentre où tout le matériel est à toi, on suppose en général qu'il n'y a pas de faute byzantine. Les protocoles qui les tolèrent sont compliqués, coûteux, et exigent que **plus des deux tiers** des nœuds fonctionnent correctement (avec 4 nœuds, un seul peut être fautif). Ils n'aident pas non plus contre les **bugs logiciels**, puisque tous les nœuds exécutent le même code, sauf à avoir plusieurs implémentations indépendantes. Et un attaquant qui compromet un nœud peut sans doute compromettre les autres. La protection réelle reste l'authentification, le contrôle d'accès, le chiffrement et les pare-feux.

Un client web, lui, peut être malveillant : c'est pour cela que le serveur **valide et nettoie les entrées**. Mais le serveur reste l'autorité ; il n'y a pas besoin d'un protocole byzantin pour cela.

### Les petits mensonges

Même entre nœuds honnêtes, des formes **faibles** de mensonge arrivent, et on s'en protège à peu de frais :

- un paquet **corrompu** par du matériel ou un bug de pilote peut échapper aux sommes de contrôle de TCP et UDP : ajoute une **somme de contrôle applicative** ;
- une application publique doit **valider ses entrées** : valeurs dans une plage raisonnable, taille des chaînes bornée (pour éviter un déni de service par allocation géante) ;
- un client NTP interroge **plusieurs serveurs** et écarte celui qui s'éloigne de la majorité.

## Modèles de système et correction

Pour raisonner sur un algorithme distribué, on fixe ce qu'il peut supposer : c'est le **modèle de système**.

**Hypothèses de temps :**

- **synchrone** : délais réseau, pauses et dérives d'horloge sont bornés. Pas réaliste ;
- **partiellement synchrone** : le système se comporte comme un système synchrone **la plupart du temps**, mais dépasse parfois les bornes, sans limite. C'est le modèle **réaliste** de beaucoup de systèmes ;
- **asynchrone** : aucune hypothèse de temps, pas même d'horloge, donc pas de timeout. Très restrictif.

**Hypothèses de panne :**

- **crash-stop** : un nœud ne peut tomber qu'en s'arrêtant, et ne revient jamais ;
- **crash-recovery** : un nœud peut planter à tout moment et redémarrer après un temps inconnu ; son **stockage durable** survit, sa **mémoire** est perdue ;
- **byzantine** : un nœud peut faire absolument n'importe quoi.

Pour les vrais systèmes, le modèle le plus utile est **partiellement synchrone avec crash-recovery**.

### Sûreté et vivacité

Un algorithme est correct s'il respecte ses **propriétés** dans le modèle choisi. Pour un service de jetons de clôture :

- **unicité** : deux demandes ne reçoivent jamais le même jeton ;
- **séquence croissante** : si la demande x s'est terminée avant que y commence, alors le jeton de x est plus petit que celui de y ;
- **disponibilité** : un nœud qui demande un jeton et ne plante pas finit par recevoir une réponse.

Les deux premières sont des propriétés de **sûreté** : « rien de mal n'arrive ». La troisième est de **vivacité** : « quelque chose de bien finit par arriver ». Le mot « finit par » (*eventually*) trahit souvent la vivacité ; la cohérence à terme (ch05) en est une.

La distinction est précise : si une propriété de sûreté est violée, on peut désigner **l'instant** où elle l'a été (le jeton dupliqué a été émis à 14:03:12), et **le mal est fait**, on ne peut pas l'annuler. Une propriété de vivacité peut ne pas être vraie à un instant donné, mais **peut toujours le devenir** plus tard (la réponse n'est pas encore arrivée).

En pratique, on exige que la **sûreté tienne toujours**, dans toutes les situations du modèle, même si tous les nœuds plantent ou si le réseau entier tombe. Pour la **vivacité**, on accepte des conditions : par exemple, une réponse n'est due que si une majorité de nœuds n'a pas planté et si le réseau a fini par se rétablir.

### Le modèle et la réalité

Un modèle simplifie. Le crash-recovery suppose que le stockage durable survit, mais un disque peut être corrompu, effacé, ou ne plus être reconnu après un redémarrage à cause d'un bug de firmware. Un algorithme à quorum suppose qu'un nœud se **souvient** de ce qu'il a affirmé avoir stocké ; un nœud atteint d'**amnésie** casse le quorum. Une implémentation réelle doit parfois traiter ce que la théorie déclare impossible, ne serait-ce qu'en s'arrêtant proprement avec un message d'erreur clair.

Les modèles restent précieux : prouver un algorithme correct dans un modèle ne garantit pas que son implémentation l'est, mais c'est un excellent premier pas, et cela révèle des problèmes qu'aucun test n'aurait trouvés. **Analyse théorique et tests empiriques sont tous deux nécessaires.**

## Pièges fréquents

- **Laisser un nœud décider seul qu'il est leader** : un quorum peut avoir décidé le contraire.
- **Déployer 4 nœuds pour la tolérance aux pannes** : la majorité est 3, on ne tolère qu'une panne, comme avec 3 nœuds.
- **Protéger une ressource par un verrou sans jeton vérifié par la ressource** : un zombie sorti d'une pause l'écrasera.
- **Utiliser l'heure du client comme jeton** : elle n'est pas croissante et peut mentir.
- **Croire qu'un protocole byzantin protège des bugs** : tous les nœuds ont le même bug.
- **Échanger sûreté et vivacité** : attendre plus longtemps peut réparer la vivacité, jamais une sûreté violée.

## À retenir

- Un nœud ne sait rien avec certitude ; la vérité est décidée par un quorum majoritaire, unique par construction.
- Un détenteur de verrou figé peut se réveiller zombie ; seule la ressource, en vérifiant des **jetons de clôture** croissants, peut le stopper.
- Les fautes byzantines (nœuds menteurs) exigent plus des deux tiers de nœuds honnêtes ; dans un datacentre, on les ignore et on se protège par l'authentification et la validation des entrées.
- Modèle réaliste : partiellement synchrone, crash-recovery.
- Sûreté = rien de mal n'arrive (violation datée, irréparable), toujours exigée ; vivacité = quelque chose de bien finit par arriver, sous conditions.
