---
id: ddia-ch09-l03
title: Le verrouillage en deux phases (2PL)
source:
  chapter: 7
  pages: 257-261
duration_min: 45
concepts:
- id: ddia-2pl
  label: '2PL : plusieurs lecteurs OU un seul écrivain ; les écrivains bloquent les lecteurs et inversement, ce qui donne la sérialisabilité'
- id: ddia-2pl-vs-2pc
  label: 2PL (verrous) n'est pas 2PC (validation en deux phases, distribué)
- id: ddia-2pl-implementation
  label: Verrous partagé/exclusif, promotion, verrous tenus jusqu'à la fin ; les deux phases sont acquisition puis relâchement en bloc
- id: ddia-deadlock
  label: 'Interblocage : A attend B et B attend A ; la base le détecte et annule une transaction'
- id: ddia-2pl-performance
  label: 'Coût : surcoût des verrous, concurrence réduite, latences instables aux percentiles élevés, interblocages fréquents'
- id: ddia-predicate-locks
  label: 'Verrous de prédicat : portent sur tous les objets correspondant à une condition, même futurs (fantômes)'
- id: ddia-index-range-locks
  label: 'Verrous d''intervalle d''index (next-key) : approximation moins précise mais bon marché ; repli sur la table entière'
glossary:
- term: 2PL (two-phase locking)
  definition: 'Protocole où tout verrou est tenu jusqu''à la fin de la transaction : phase d''acquisition, puis relâchement en bloc.'
- term: verrou partagé / exclusif
  definition: 'Partagé : plusieurs lecteurs ; exclusif : un seul écrivain, aucun lecteur.'
- term: interblocage (deadlock)
  definition: Deux transactions s'attendent mutuellement ; la base en annule une.
- term: verrou de prédicat
  definition: Verrou sur tous les objets qui répondent à une condition de recherche, y compris ceux qui n'existent pas encore.
- term: verrou d'intervalle d'index (next-key lock)
  definition: Approximation d'un verrou de prédicat, attachée à une plage de valeurs d'un index.
visuals: []
labs:
- ddia-ch09-l03-lab-2pl-design
extra: false
xp: 45
---

## Pourquoi c'est important

Pendant une trentaine d'années, il n'y a eu qu'un seul algorithme de sérialisabilité largement utilisé : le **verrouillage en deux phases** (*two-phase locking*, 2PL). Il fonctionne toujours : MySQL (InnoDB) et SQL Server l'utilisent pour leur niveau serializable, DB2 pour son repeatable read. Comprendre ses coûts explique pourquoi beaucoup d'applications l'évitent.

> **2PL n'est pas 2PC.** Le verrouillage en deux phases ressemble de nom à la validation en deux phases (*two-phase commit*, 2PC), mais ce sont des choses complètement différentes. On verra 2PC au module 12.

## Des verrous bien plus forts

On a vu que des verrous empêchent les écritures sales : si deux transactions écrivent le même objet, la seconde attend la fin de la première. 2PL va beaucoup plus loin. **Plusieurs transactions peuvent lire le même objet tant que personne ne l'écrit.** Mais dès que quelqu'un veut écrire (modifier ou supprimer), il faut un **accès exclusif** :

- si la transaction A a lu un objet et que B veut l'écrire, B doit attendre que A valide ou annule (B ne peut pas modifier l'objet dans le dos de A) ;
- si A a écrit un objet et que B veut le lire, B doit attendre que A termine (lire une ancienne version n'est pas acceptable avec 2PL).

En 2PL, **les écrivains bloquent les lecteurs et inversement**. L'isolation par instantané avait pour mantra « les lecteurs ne bloquent jamais les écrivains et inversement » : c'est la différence essentielle. Mais comme 2PL est **sérialisable**, il protège de toutes les conditions de course vues plus haut, y compris les mises à jour perdues et le write skew.

## Comment c'est implémenté

Chaque objet de la base a un **verrou**, en **mode partagé** ou **exclusif** :

- pour **lire**, une transaction doit d'abord obtenir le verrou en mode partagé. Plusieurs transactions peuvent le détenir en même temps, mais si une autre a déjà un verrou exclusif, elles attendent ;
- pour **écrire**, elle doit obtenir le verrou en mode exclusif. Aucune autre ne peut le détenir en même temps (ni partagé, ni exclusif) : s'il existe un verrou, elle attend ;
- si une transaction lit puis écrit, elle peut **promouvoir** son verrou partagé en exclusif, avec les mêmes règles qu'un verrou exclusif direct ;
- une fois obtenu, le verrou est **conservé jusqu'à la fin de la transaction** (validation ou annulation). C'est l'origine du nom : première phase (pendant l'exécution), les verrous s'**acquièrent** ; seconde phase (à la fin), ils sont tous **relâchés**.

Avec autant de verrous, il arrive facilement que A attende B pendant que B attend A : un **interblocage** (*deadlock*). La base **détecte automatiquement** les interblocages et annule l'une des transactions pour que les autres avancent. L'application doit la réessayer.

## La performance de 2PL

Le gros défaut de 2PL, et la raison pour laquelle tout le monde ne l'utilise pas depuis les années 1970, c'est la **performance** : débit et temps de réponse sont nettement pires qu'avec une isolation faible. En partie à cause du surcoût d'acquisition et de relâchement des verrous, surtout à cause de la **moindre concurrence** : par construction, si deux transactions concurrentes font quoi que ce soit qui puisse provoquer une condition de course, l'une doit attendre l'autre.

Les bases relationnelles traditionnelles ne limitent pas la durée d'une transaction, car elles sont conçues pour des applications interactives qui attendent l'humain : quand une transaction doit en attendre une autre, il n'y a **aucune limite** à l'attente. Même avec des transactions courtes, une file peut se former si plusieurs veulent le même objet. Les bases en 2PL ont donc des **latences instables**, très lentes aux percentiles élevés en cas de contention. Il suffit d'une transaction lente, ou qui touche beaucoup de données et acquiert beaucoup de verrous, pour que le reste du système s'arrête. Les **interblocages** sont aussi beaucoup plus fréquents en 2PL sérialisable qu'avec read committed : une transaction annulée et réessayée refait tout son travail.

## Verrous de prédicat

Un détail important a été passé sous silence : les **fantômes**. Une base sérialisable doit les empêcher. Pour la réservation de salle, si une transaction a cherché les réservations d'une salle sur un créneau, une autre ne doit pas pouvoir insérer en parallèle une réservation pour la même salle et un créneau chevauchant (mais elle peut en insérer pour d'autres salles ou d'autres créneaux).

Comment ? Conceptuellement, avec un **verrou de prédicat**. Il fonctionne comme un verrou partagé/exclusif, mais plutôt que d'appartenir à un objet (une ligne), il appartient à **tous les objets qui correspondent à une condition de recherche** :

```sql
SELECT * FROM bookings
  WHERE room_id = 123 AND
    end_time   > '2018-01-01 12:00' AND
    start_time < '2018-01-01 13:00';
```

- pour **lire** des objets qui satisfont une condition, une transaction doit obtenir un verrou de prédicat **partagé** sur les conditions de la requête. Si une autre transaction détient un verrou exclusif sur un objet qui y correspond, elle attend ;
- pour **insérer, modifier ou supprimer**, elle doit vérifier si l'ancienne ou la nouvelle valeur correspond à un verrou de prédicat existant. Si oui, elle attend que le détenteur termine.

L'idée clé : **un verrou de prédicat s'applique même aux objets qui n'existent pas encore** mais pourraient être ajoutés (les fantômes). Avec les verrous de prédicat, 2PL empêche toute forme de write skew et d'autres conditions de course.

## Verrous d'intervalle d'index

Hélas, les verrous de prédicat ne sont pas performants : s'il y a beaucoup de verrous de transactions actives, tester les correspondances est coûteux. La plupart des bases en 2PL implémentent donc des **verrous d'intervalle d'index** (*next-key locking*), une approximation simplifiée.

On peut **sans risque** simplifier un prédicat en le faisant correspondre à un ensemble plus grand d'objets. Par exemple, un verrou de prédicat sur les réservations de la salle 123 entre midi et 13 h peut être approximé en verrouillant les réservations de la salle 123 à **n'importe quelle heure**, ou toutes les salles entre midi et 13 h. C'est sûr : toute écriture qui correspond au prédicat d'origine correspondra aussi aux approximations.

Dans la base de réservations, on a probablement un index sur `room_id` et/ou sur `start_time` et `end_time` :

- si l'index est sur `room_id`, la base peut attacher un verrou partagé à **l'entrée d'index** de la salle 123, indiquant qu'une transaction a cherché des réservations de cette salle ;
- si elle utilise un index temporel, elle peut attacher un verrou partagé à une **plage de valeurs** de l'index.

Dans les deux cas, une approximation de la condition est attachée à un index. Une autre transaction qui veut insérer, modifier ou supprimer une réservation de la même salle ou d'un créneau chevauchant devra mettre à jour la même partie de l'index, y rencontrera le verrou partagé et attendra. Les verrous d'intervalle d'index sont **moins précis** que les verrous de prédicat (ils peuvent verrouiller plus que nécessaire) mais bien moins coûteux : un bon compromis. S'il n'y a aucun index adapté, la base se rabat sur un **verrou partagé sur la table entière** : pas bon pour la performance (il bloque toutes les écritures), mais sûr.


## Pièges fréquents

- **Confondre 2PL et 2PC.**
- **Garder une transaction ouverte longtemps** sous 2PL : elle bloque tout ce qu'elle a verrouillé.
- **Ignorer les interblocages** : prévoir la reprise après annulation.
- **Compter sur 2PL avec des lectures longues** : elles bloquent les écrivains.

## À retenir

- 2PL : verrous partagés pour lire, exclusifs pour écrire, tenus jusqu'à la fin ; lecteurs et écrivains se bloquent.
- Sérialisable (empêche lost updates, write skew), mais lent et instable ; interblocages détectés et annulés.
- Fantômes : verrous de prédicat (coûteux) approximés par des verrous d'intervalle d'index.
