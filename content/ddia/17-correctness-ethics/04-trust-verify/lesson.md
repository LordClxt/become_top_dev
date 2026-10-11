---
id: ddia-ch17-l04
title: "Faire confiance, mais vérifier"
source: { chapter: 12, pages: "530-533" }
duration_min: 30
concepts:
  - id: ddia-correct-system-model-assumptions
    label: "Un modèle de système suppose que certaines fautes n'arrivent pas ; ces hypothèses ne sont que probables (bits qui basculent, bugs des bases)"
  - id: ddia-correct-auditing
    label: "Auditer : relire et vérifier les données au lieu de croire aux promesses (relecture en arrière-plan, restauration des sauvegardes)"
  - id: ddia-correct-verification-culture
    label: "Une culture de la vérification : des systèmes qui s'auto-vérifient en continu, comme des tests automatisés"
  - id: ddia-correct-auditability-by-design
    label: "Concevoir pour l'audit : événements immuables et dérivation déterministe permettent de recalculer et comparer"
  - id: ddia-correct-e2e-integrity-check
    label: "Vérifier l'intégrité de bout en bout : plus le contrôle couvre de composants, moins une corruption passe inaperçue"
  - id: ddia-correct-crypto-audit
    label: "Outils vérifiables : arbres de Merkle, transparence des certificats ; le scepticisme sur les blockchains"
glossary:
  - term: "audit"
    definition: "Vérification que les données sont intactes et que les données dérivées correspondent à leur source."
  - term: "inversion de bits (bit flip)"
    definition: "Bit mémoire ou disque qui change de valeur sans écriture ; rare, mais pas impossible (rayonnement, rowhammer)."
  - term: "arbre de Merkle"
    definition: "Arbre de hachages où chaque nœud hache ses enfants ; prouve qu'un élément appartient à un ensemble avec un nombre logarithmique de hachages."
  - term: "transparence des certificats (Certificate Transparency)"
    definition: "Journaux publics, vérifiables par arbres de Merkle, de tous les certificats TLS émis."
  - term: "débogage par voyage dans le temps"
    definition: "Rejouer un log d'événements avec le même code pour reconstruire exactement l'état d'un instant passé."
visuals: []
labs: [ddia-ch17-l04-lab-audit-design]
xp: 40
---

## Pourquoi c'est important

Toute la théorie des chapitres précédents repose sur des **hypothèses** : un processus peut planter, mais le disque ne perd pas ce qu'on a synchronisé ; le réseau peut perdre un paquet, mais le CPU multiplie juste. Ces hypothèses sont **raisonnables**, mais elles sont **probables**, pas certaines. Et le logiciel, même celui d'une base réputée, a des bugs. La seule défense honnête : **vérifier**. Cette leçon explique comment construire des systèmes qui se vérifient eux-mêmes, et pourquoi les logs d'événements s'y prêtent si bien.

## Les hypothèses du modèle

Un modèle de système (chapitre sur les problèmes des systèmes distribués) sépare ce qui peut mal tourner (plantages, coupures, délais) de ce qu'on suppose impossible (corruption de la mémoire, données perdues après `fsync`). Mais « impossible » veut dire « assez rare pour l'ignorer en pratique ». À grande échelle, le rare arrive :

- des données se **corrompent** dans la mémoire, sur le disque ou dans le réseau, sans que les sommes de contrôle des couches basses le voient toujours ;
- la mémoire peut voir des bits basculer, et certaines puces sont même vulnérables à des **motifs d'accès** qui en font basculer volontairement (*rowhammer*) ;
- les **logiciels ont des bugs** : des versions de MySQL ont échoué à maintenir une contrainte d'unicité, et l'isolation sérialisable de PostgreSQL a connu des bugs laissant passer du *write skew*. Si les bases mûres, testées par des milliers de personnes, en ont, ton code applicatif en a davantage.

Quand l'application utilise mal une base (une isolation faible mal comprise, une contrainte oubliée), la garantie promise ne protège rien. La **cohérence** au sens d'ACID suppose une base sans bug et une application qui l'utilise correctement.

## Ne pas croire aveuglément aux promesses

Si la corruption finira par arriver, il faut un moyen de la **détecter** : c'est l'**audit**. Les systèmes mûrs l'ont compris. HDFS et Amazon S3 ne font pas une confiance totale aux disques : des processus d'arrière-plan **relisent** en continu les fichiers, les comparent aux autres répliques et déplacent les données d'un disque qui faiblit.

La règle : si tu veux être sûr que tes données sont encore là, **lis-les et vérifie-les**. La plupart du temps, tout va bien ; justement, le jour où ça ne va pas, tu veux l'apprendre tôt, pas au moment d'en avoir besoin. Même logique pour les **sauvegardes** : une sauvegarde jamais restaurée est une hypothèse, pas une sauvegarde. Essaie régulièrement de restaurer.

## Une culture de la vérification

Les bases ACID ont habitué les équipes à leur faire confiance, et donc à **négliger l'auditabilité**. Quand des technologies aux garanties plus faibles (bases NoSQL, stockage moins mûr) sont arrivées, cette confiance est devenue dangereuse : les garanties avaient disparu, mais pas l'habitude de ne rien vérifier.

Kleppmann plaide pour des systèmes **auto-validants** ou **auto-audités**, qui vérifient continuellement leur propre intégrité, au lieu de croire leurs promesses sur parole.

## Concevoir pour l'audit

Une transaction qui modifie plusieurs objets d'une base est difficile à interpréter après coup : la base garde le résultat (des lignes modifiées), pas le **pourquoi**. Même avec un journal des transactions, retrouver l'intention est laborieux.

Avec une architecture par événements, c'est l'inverse :

- l'entrée de l'utilisateur est un **événement immuable**, conservé ;
- toutes les mises à jour d'état en sont **dérivées** de façon **déterministe et rejouable** : le même log passé dans la même version du code donne exactement les mêmes états.

Cela rend l'intégrité **vérifiable** :

- on peut hacher le stockage des événements pour vérifier qu'il n'a pas été corrompu ;
- on peut **recalculer** n'importe quel état dérivé en rejouant le log, et le comparer à l'état réel ;
- on peut faire tourner en parallèle une **dérivation redondante** et comparer en continu.

Bonus : le déterminisme facilite le **débogage**. Pour comprendre pourquoi un solde était faux mardi à 14 h, on rejoue le log jusqu'à cet instant et on observe : c'est un voyage dans le temps.

Exemple : tes soldes de comptes sont dérivés d'un log de 40 millions de virements. Chaque nuit, un auditeur rejoue le log, recalcule les soldes et les compare à la base des soldes. Le jour où un processeur applique un crédit deux fois à cause d'un bug de déduplication, l'auditeur signale un écart sur un compte précis dès la nuit suivante, avec l'identifiant de la requête fautive.

## Encore l'argument de bout en bout

Une vérification ne voit que ce qu'elle couvre. Si tu vérifies séparément le disque, le réseau et la base, un bug du processeur de flux passe entre les mailles. Plus un contrôle d'intégrité englobe de systèmes, **moins une corruption peut passer inaperçue**. Vérifier de bout en bout un pipeline de données dérivées (de l'événement d'entrée au résultat final) couvre implicitement le matériel, le réseau, les services et les algorithmes qui sont entre les deux.

Ces contrôles continus jouent le même rôle que les **tests automatisés** pour le code : ils donnent la confiance nécessaire pour **avancer vite**. Changer un processeur de flux devient moins risqué si un auditeur compare en permanence ses sorties à un recalcul.

## Des outils pour des systèmes auditables

Peu de systèmes de données font de l'auditabilité une priorité. On pourrait aller plus loin avec la **cryptographie**, pour prouver l'intégrité même face à des fautes matérielles, des bugs ou des actes malveillants.

- Les **cryptomonnaies et blockchains** sont, au fond, des bases distribuées dont chaque réplique vérifie le travail des autres, avec un consensus tolérant aux nœuds malveillants (fautes byzantines). Kleppmann reste **sceptique** : la tolérance byzantine coûte cher, la preuve de travail (le minage de Bitcoin) gaspille énormément d'énergie, et le débit transactionnel est faible.
- Plus prometteur : les techniques d'audit comme la **transparence des certificats**, qui s'appuient sur des **arbres de Merkle**. Chaque feuille est le hachage d'un enregistrement, chaque nœud le hachage de ses enfants, et la racine résume tout. Pour prouver qu'un enregistrement appartient à un journal d'un million d'entrées, il suffit de fournir environ log₂(1 000 000) ≈ 20 hachages, et non le million d'entrées.

Ces algorithmes pourraient se diffuser dans les systèmes de données ordinaires ; le défi est de les rendre aussi performants que des systèmes non vérifiables.

### Aller plus loin : où on les trouve déjà

Git identifie chaque objet par son hachage et forme un graphe de Merkle : modifier un commit ancien change tous les identifiants qui suivent. Amazon a proposé une base à journal vérifiable (QLDB, depuis arrêtée), et des bases comme Dolt appliquent ce principe aux tables. Dans Kafka, on peut approcher l'idée en chaînant un hachage de chaque lot de messages pour détecter une réécriture du log.

## Pièges fréquents

- **Supposer que « la base garantit l'unicité » dispense de vérifier** : même les bases mûres ont eu des bugs, et l'application peut mal s'en servir.
- **N'avoir jamais restauré une sauvegarde** : tu ne sais pas si elle fonctionne.
- **Vérifier chaque composant isolément** : les bugs entre les composants échappent au contrôle.
- **Mettre à jour l'état en place sans garder les événements** : impossible ensuite de recalculer pour comparer.
- **Choisir une blockchain pour « l'auditabilité »** sans mesurer le coût : un journal vérifiable par arbre de Merkle suffit souvent.

## À retenir

- Les hypothèses d'un modèle de système sont probables, pas certaines ; matériel et logiciel corrompent parfois les données.
- Auditer = relire et comparer ; HDFS et S3 le font en continu. Restaure régulièrement tes sauvegardes.
- Événements immuables + dérivation déterministe = un état qu'on peut recalculer et comparer, et déboguer en rejouant.
- Vérifier de bout en bout couvre tout ce qui se trouve entre l'entrée et le résultat ; c'est le filet qui permet d'avancer vite.
- Les arbres de Merkle prouvent l'appartenance avec un nombre logarithmique de hachages ; les blockchains offrent l'audit au prix fort.
