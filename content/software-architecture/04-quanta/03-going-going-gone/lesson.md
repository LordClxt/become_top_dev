---
id: arch-ch04-l03
title: "Kata : Going, Going, Gone"
source: { chapter: 7, pages: "115-118" }
duration_min: 45
concepts:
  - id: arch-ggg-characteristics
    label: "Dériver les caractéristiques du kata : scalabilité, élasticité, performance, sécurité, fiabilité de l'ordre"
  - id: arch-domain-litmus
    label: "Test décisif : faut-il des connaissances métier pour l'implémenter ? Si oui, c'est du domaine"
  - id: arch-nonuniform
    label: "Les besoins ne sont pas uniformes : le commissaire-priseur est plus critique qu'un enchérisseur"
  - id: arch-quanta-per-characteristics
    label: "Définir les caractéristiques par quantum mène plus tôt à une architecture hybride"
glossary:
  - term: "Going, Going, Gone"
    definition: "Kata d'enchères en ligne en direct, à l'échelle nationale, qui sert de fil rouge au livre."
  - term: "indice de réputation"
    definition: "Exigence du kata dont le sens est métier : il faut demander à un expert ce qu'elle recouvre."
  - term: "architecture hybride"
    definition: "Architecture qui combine plusieurs styles ou plusieurs jeux de caractéristiques selon les parties du système."
visuals: []
labs: [arch-ch04-l03-lab-characteristics-per-quantum, arch-ch04-l03-lab-closing-night]
xp: 45
---

## Pourquoi c'est important

Si tu évalues la disponibilité de Going, Going, Gone **pour tout le système**, tu obtiens un compromis absurde : soit tu paies le niveau du plus exigeant partout, soit tu sous-protèges la partie critique. Ce kata montre, exigence par exigence, pourquoi les caractéristiques doivent se définir **par quantum**, et comment cette analyse fait apparaître très tôt une architecture **hybride**.

## L'énoncé

**Description** : une maison de ventes aux enchères veut passer ses ventes en ligne, à l'échelle nationale. Les clients choisissent une vente, attendent qu'elle commence, puis enchérissent comme s'ils étaient dans la salle avec le commissaire-priseur.

**Utilisateurs** : des centaines de participants par vente, peut-être des milliers, et autant de ventes simultanées que possible.

**Exigences** :
- Les ventes doivent être aussi **temps réel** que possible.
- Les enchérisseurs s'inscrivent avec une carte bancaire ; la carte est débitée automatiquement s'ils gagnent.
- Les participants sont suivis par un **indice de réputation**.
- Les enchérisseurs voient la **vidéo en direct** de la vente et toutes les offres au fil de l'eau.
- Les offres en ligne et en salle doivent être reçues **dans l'ordre** où elles sont passées.

**Contexte additionnel** : la société grandit en **fusionnant** avec de petits concurrents ; le **budget n'est pas contraint** (direction stratégique) ; elle sort d'un **procès pour fraude** réglé à l'amiable.

## Exigence par exigence

### 1. Échelle nationale, milliers de participants, temps réel

**Scalabilité** pour le nombre d'utilisateurs, et **élasticité** pour la nature en rafales des enchères. Les exigences citent l'échelle, pas les rafales : c'est la connaissance du domaine qui les révèle. Les enchérisseurs se répartissent-ils sagement pendant la vente, ou deviennent-ils frénétiques à la fin ? Et le temps réel fait de la **performance** une caractéristique clé.

### 2. Carte bancaire, procès pour fraude

Les deux pointent vers la **sécurité**. Implicite partout, elle ne devient caractéristique d'architecture que si elle exige une **structure** particulière. Pour les cartes, une bonne hygiène suffit souvent (pas de numéro en clair, chiffrement en transit…). Mais le **procès pour fraude** doit faire **s'arrêter** l'architecte : quelque chose a mal tourné. Quelle que soit la sécurité qu'il conçoit, il doit **demander des précisions**.

### 3. L'indice de réputation

On serait tenté d'inventer une « anti-trollabilité », ou de voir dans « suivi » de l'**auditabilité** et de la **journalisation**. Le livre donne un **test décisif** :

> **Faut-il des connaissances métier pour l'implémenter, ou est-ce une caractéristique abstraite ?**

« Indice de réputation » n'a pas de définition standard : l'architecte doit aller voir un analyste métier pour savoir ce qu'il recouvre. C'est donc du **domaine**. À l'inverse, l'**élasticité** se discute dans l'abstrait, quelle que soit l'application (banque, catalogue, vidéo). Rappel utile : l'analyse des caractéristiques n'est qu'une petite partie du travail ; on y cherche les exigences à **impact structurel** que le domaine ne couvre pas déjà.

### 4. Les fusions

Pas d'impact immédiat, mais un **arbitre** dans les trade-offs futurs. Si l'intégration avec les sociétés rachetées n'est pas un sujet, l'architecte peut choisir un protocole très spécifique au problème ; sinon, il choisira peut-être quelque chose de moins parfait pour gagner en **interopérabilité**. Une caractéristique implicite et subtile.

### 5. Budget non contraint

Beaucoup de katas imposent un budget serré. Ici non : l'architecte peut choisir des architectures plus **élaborées** ou **spécialisées**, ce qui tombe bien vu l'exigence suivante.

### 6. Vidéo en direct, offres dans l'ordre

C'est l'exigence qui ruine l'idée de caractéristiques **à l'échelle du système**. Prends la **disponibilité** : est-elle uniforme ? La disponibilité d'**un** enchérisseur compte-t-elle autant que celle du **commissaire-priseur** ? On veut de bonnes mesures pour les deux, mais si le commissaire-priseur ne peut plus accéder au site, **plus personne** ne peut enchérir. La **fiabilité** accompagne souvent la disponibilité : ici, il faut garantir que l'**ordre des messages** est correct, sans conditions de course.

## Trois quanta, trois profils

Différentes parties de l'architecture ont besoin de caractéristiques différentes. Le livre identifie trois quanta évidents :

| Quantum | Contenu | Caractéristiques |
|---|---|---|
| **Retour enchérisseur** | Flux des offres et flux vidéo | Disponibilité, scalabilité, performance |
| **Commissaire-priseur** | Le commissaire-priseur en salle | Disponibilité, fiabilité, scalabilité, élasticité, performance, sécurité |
| **Enchérisseur** | Les enchérisseurs en ligne et leurs offres | Fiabilité, disponibilité, scalabilité, élasticité |

Le quantum sert à penser le **déploiement**, le **couplage**, l'emplacement des **données** et les styles de **communication**. En analysant les caractéristiques par quantum, l'architecte voit **dès maintenant** qu'il faudra une architecture **hybride** : il n'aurait pas pu le voir avec une liste unique pour tout le système.

### Sous le capot : pourquoi séparer l'enchérisseur du commissaire-priseur

Si l'offre du commissaire-priseur et celles des milliers d'enchérisseurs passaient par le **même** service synchrone, un pic d'enchérisseurs en fin de vente ralentirait **aussi** le commissaire-priseur : l'appel synchrone aligne les caractéristiques (leçon 1). Séparer les deux captures et les relier par des liens asynchrones au service qui ordonne les offres protège le chemin le plus critique. Le module 05 reprendra exactement ce découpage (Bid Capture et Auctioneer Capture).

## Pièges fréquents

- **Une disponibilité pour tout le système** : on sur-protège les flux de lecture ou on sous-protège le commissaire-priseur.
- **Promouvoir une exigence métier en -ilité** (« réputabilité ») : applique le test de la connaissance métier.
- **Ignorer un signal de contexte** (le procès pour fraude) : il appelle une question au métier, pas une supposition.
- **Oublier l'élasticité** parce que l'énoncé ne parle que d'échelle.

## À retenir

- Échelle + temps réel → **scalabilité**, **élasticité** (implicite, fins de vente), **performance**.
- **Test décisif** : si l'implémenter demande des connaissances métier, c'est du **domaine**.
- Les besoins ne sont **pas uniformes** : le commissaire-priseur est le point critique, l'**ordre** des offres exige de la fiabilité.
- Trois quanta (retour enchérisseur, commissaire-priseur, enchérisseur), trois profils : l'architecture sera **hybride**, et on le sait tôt.
