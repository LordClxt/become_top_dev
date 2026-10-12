---
id: ddia-ch09-l01
title: Pourquoi la sérialisabilité
source:
  chapter: 7
  pages: 251-252
duration_min: 20
concepts:
- id: ddia-isolation-mess
  label: Les niveaux d'isolation faibles sont difficiles à comprendre, incohérents d'une base à l'autre, et on ne sait pas détecter les conditions
    de course
- id: ddia-serializable-def
  label: 'Sérialisable : le résultat est le même que si les transactions s''exécutaient une à une, sans concurrence ; la base empêche toutes les
    conditions de course'
- id: ddia-three-techniques
  label: 'Trois techniques : exécution en série, verrouillage en deux phases (2PL), contrôle optimiste (SSI)'
glossary:
- term: sérialisable
  definition: Garantit que le résultat de transactions exécutées en parallèle est identique à une exécution en série, dans un ordre quelconque.
- term: condition de course
  definition: Un résultat qui dépend du hasard du timing entre transactions concurrentes.
visuals: []
labs:
- ddia-ch09-l01-lab-serial-equivalence-design
extra: false
xp: 20
---

## Pourquoi c'est important

Le module précédent a laissé un tableau déprimant : certains problèmes sont empêchés par read committed et l'isolation par instantané, d'autres non (write skew, fantômes). Trois constats :

- les niveaux d'isolation sont **difficiles à comprendre** et implémentés de façon **incohérente** d'une base à l'autre (le sens de « repeatable read » varie énormément) ;
- en regardant le code d'une application, il est **difficile de savoir** s'il est sûr à un niveau d'isolation donné, surtout dans une grande application où l'on ne sait pas tout ce qui se passe en parallèle ;
- il n'existe **pas de bons outils** pour détecter les conditions de course. L'analyse statique pourrait aider en théorie, mais elle n'est pas passée en pratique. Tester la concurrence est dur : les problèmes sont non déterministes et n'apparaissent que si l'on a la malchance d'un certain timing.

Ce n'est pas nouveau : depuis les années 1970, quand les niveaux faibles sont apparus. Et depuis, la réponse des chercheurs est simple : **utilisez l'isolation sérialisable**.

## Ce que garantit la sérialisabilité

L'isolation sérialisable est en général considérée comme le niveau d'isolation le plus fort. Elle garantit que, même si les transactions s'exécutent en parallèle, **le résultat final est le même que si elles s'étaient exécutées une par une, en série, sans aucune concurrence**. Donc, si les transactions se comportent correctement quand elles s'exécutent seules, elles restent correctes lorsqu'elles s'exécutent en parallèle : la base **empêche toutes les conditions de course possibles**.

Exemple : une transaction ajoute 1 à `x`, une autre double `x`. Si `x` vaut 10, les deux ordres sérialisés donnent 22 (ajouter puis doubler) ou 21 (doubler puis ajouter). Une exécution concurrente qui donnerait 11 ou 20 (une mise à jour perdue) **n'est pas sérialisable**. Notez que la sérialisabilité n'impose pas *quel* ordre série : elle exige seulement qu'**il existe** un ordre série équivalent.

## Alors pourquoi tout le monde ne l'utilise pas ?

Si la sérialisabilité vaut mieux que le fouillis des niveaux faibles, pourquoi l'isolation faible reste-t-elle la norme ? Pour y répondre, il faut examiner les façons de l'implémenter et leurs performances. La plupart des bases qui la proposent utilisent l'une de ces trois techniques :

- **exécuter littéralement les transactions dans un ordre série** (leçon 2) ;
- **le verrouillage en deux phases** (2PL), qui a été pendant des décennies la seule option viable (leçon 3) ;
- les techniques de **contrôle de concurrence optimiste**, comme la **sérialisabilité par instantané** (SSI, leçon 4).

On les discute d'abord pour une base sur un seul nœud ; les modules 11 et 12 les généralisent aux transactions réparties sur plusieurs nœuds.


## Pièges fréquents

- **Croire que « serializable » est un niveau uniforme** : Oracle appelait « serializable » de l'isolation par instantané.
- **Confondre sérialisable et sérialisation** (encodage, module 04) : deux notions sans rapport, qui partagent un nom.
- **Penser que sérialisable veut dire séquentiel** : seule l'équivalence à un ordre série est exigée.
- **Se reposer sur les tests** pour des bugs de timing.

## À retenir

- Sérialisable : même résultat qu'une exécution en série ; il suffit qu'un ordre série équivalent existe.
- La base prévient alors toutes les conditions de course ; l'application n'a plus à raisonner sur la concurrence.
- Trois techniques : exécution en série, 2PL, SSI.
