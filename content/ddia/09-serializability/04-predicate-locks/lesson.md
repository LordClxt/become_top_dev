---
id: ddia-ch09-l04
title: "Verrous de prédicat et verrous de plage d'index"
source: { chapter: 7, pages: "259-261" }
duration_min: 30
concepts:
  - id: ddia-2pl-phantom-gap
    label: "Verrouiller des lignes existantes ne protège pas une recherche : une ligne insérée plus tard peut changer son résultat (fantôme)"
  - id: ddia-predicate-lock
    label: "Verrou de prédicat : un verrou sur toutes les lignes qui satisfont une condition de recherche, y compris celles qui n'existent pas encore"
  - id: ddia-predicate-lock-cost
    label: "Les verrous de prédicat sont exacts mais lents : chaque écriture doit être comparée à tous les prédicats actifs"
  - id: ddia-index-range-lock
    label: "Verrou de plage d'index (next-key locking) : approximer le prédicat par une entrée ou une plage d'un index, quitte à verrouiller plus large"
  - id: ddia-lock-table-fallback
    label: "Sans index adapté, la base se rabat sur un verrou partagé de toute la table"
glossary:
  - term: "fantôme (phantom)"
    definition: "Une écriture dans une transaction modifie le résultat d'une requête de recherche d'une autre transaction (voir le chapitre sur l'isolation faible)."
  - term: "prédicat"
    definition: "La condition d'une requête de recherche, par exemple `room_id = 123 AND start_time < '13:00'`."
  - term: "verrou de prédicat (predicate lock)"
    definition: "Verrou qui porte sur l'ensemble des objets satisfaisant une condition, pas sur un objet précis."
  - term: "verrou de plage d'index (index-range lock, next-key lock)"
    definition: "Approximation d'un verrou de prédicat : on verrouille une entrée ou une plage de valeurs dans un index, ce qui couvre au moins tout ce que le prédicat couvre."
visuals: []
labs: [ddia-ch09-l04-lab-predicate-design]
xp: 40
---

## Pourquoi c'est important

La leçon précédente a décrit le 2PL comme des verrous sur des **objets**. Il reste un trou : que verrouiller quand l'objet **n'existe pas encore** ? Au chapitre précédent, les **fantômes** faisaient échouer la réservation de salle : deux transactions vérifient qu'aucune réservation ne chevauche le créneau, n'en trouvent aucune, et insèrent chacune la leur. Aucune ligne existante n'a été lue en conflit, donc aucun verrou d'objet ne les aurait arrêtées. Une base sérialisable **doit** empêcher ce cas. Cette leçon montre comment, et pourquoi les bases réelles le font de façon approximative.

## Le trou des verrous d'objet

Reprenons la salle 123, réservée de midi à 13 h. La transaction A exécute :

```sql
SELECT * FROM bookings
WHERE room_id = 123
  AND end_time   > '2026-11-02 12:00'
  AND start_time < '2026-11-02 13:00';
```

Elle ne trouve **aucune** ligne. Il n'y a donc rien à verrouiller en partagé. B fait la même recherche, ne trouve rien non plus, et chacune insère sa réservation. Double réservation : c'est le *write skew* par fantôme. Pour être sérialisable, la base doit garantir que tant que A est en cours, **personne ne peut insérer** une ligne qui aurait fait partie du résultat de sa recherche.

## Le verrou de prédicat

La réponse conceptuelle est le **verrou de prédicat**. Au lieu d'appartenir à un objet, il appartient à **tous les objets qui satisfont une condition**, celle de la recherche. Il fonctionne comme un verrou partagé ou exclusif ordinaire, avec ces règles :

- Si A veut **lire** les objets qui satisfont une condition (comme le `SELECT` ci-dessus), elle prend un verrou de prédicat **partagé** sur cette condition. Si B détient un verrou exclusif sur **un** objet qui satisfait la condition, A attend.
- Si A veut **insérer, modifier ou supprimer** un objet, elle doit d'abord vérifier si l'**ancienne ou la nouvelle valeur** satisfait un verrou de prédicat existant. Si B détient un verrou de prédicat qui correspond, A attend que B valide ou abandonne.

Le point clé : le verrou de prédicat s'applique **même à des objets qui n'existent pas encore**. L'insertion de B est comparée au prédicat de A, et bloquée. Combiné au 2PL, il empêche toutes les formes de *write skew* et tous les autres conflits : l'isolation devient sérialisable.

## Pourquoi personne ne l'implémente tel quel

Les verrous de prédicat **fonctionnent mal**. S'il y a beaucoup de verrous actifs, chaque écriture doit être **comparée à chaque prédicat** pour savoir s'il correspond. Avec 2 000 transactions en cours, chacune avec ses conditions, chaque insertion doit évaluer 2 000 prédicats : c'est un coût prohibitif, qui grandit avec la charge. La plupart des bases 2PL utilisent donc une approximation.

## Les verrous de plage d'index

L'idée des **verrous de plage d'index** (*index-range locking*, aussi *next-key locking*) : remplacer le prédicat exact par un **ensemble plus grand**, facile à vérifier. Simplifier un prédicat en le rendant plus large ne pose pas de problème de sûreté : tout ce qui correspond au prédicat d'origine correspond aussi au prédicat élargi.

Pour notre salle 123 entre midi et 13 h, on peut approximer :

- en verrouillant les réservations de la salle 123 **à n'importe quelle heure** ;
- ou en verrouillant **toutes les salles** entre midi et 13 h.

Et c'est là que les index entrent en jeu. La recherche passe forcément par un index pour être rapide :

- S'il y a un index sur `room_id`, la base utilise l'entrée `123` de cet index, et y **attache un verrou partagé**.
- S'il y a un index sur le temps, la base attache le verrou à une **plage de valeurs** de cet index (de midi à 13 h).

Toute transaction qui veut insérer, modifier ou supprimer une réservation de la salle 123 (ou qui chevauche ce créneau) devra **mettre à jour la même partie de l'index**. En le faisant, elle **tombe sur le verrou partagé** et attend. Vérifier un verrou attaché à une entrée d'index ne coûte presque rien : il est déjà sur le chemin de l'écriture.

Le prix : on verrouille **plus que nécessaire**. Avec un verrou sur l'entrée `room_id = 123`, une réservation de la salle 123 **à 17 h**, qui ne gêne personne, attendra quand même la fin de A. C'est un faux conflit, accepté en échange d'un surcoût bien plus faible.

## Sans index adapté : toute la table

Si aucun index ne permet d'attacher un verrou de plage (par exemple une recherche sur une colonne non indexée), la base se rabat sur un **verrou partagé sur toute la table**. C'est sûr, mais très mauvais pour les performances : **toute** écriture dans la table, quelle qu'elle soit, attend la fin de la transaction qui a fait la recherche.

Concrètement, sous `SERIALIZABLE` dans InnoDB, l'absence d'un index sur la colonne filtrée transforme une petite recherche en verrou sur de larges plages de la table. L'index n'est plus seulement une question de vitesse de lecture : il détermine **ce que tu bloques**.

## Pièges fréquents

- **Croire que lire zéro ligne ne verrouille rien** : en sérialisable, la recherche vide doit être protégée, sinon c'est le fantôme.
- **Oublier l'index sur la colonne de recherche** : la base verrouille toute la table et toutes les écritures attendent.
- **S'étonner d'attendre pour une ligne sans rapport** : le verrou de plage couvre plus que le prédicat ; ce faux conflit est le prix de l'approximation.
- **Penser que le verrou de prédicat est l'implémentation courante** : c'est le modèle ; en pratique, ce sont les verrous de plage d'index.

## À retenir

- Les fantômes échappent aux verrous d'objet : une recherche vide n'a rien à verrouiller.
- Un verrou de prédicat porte sur toutes les lignes qui satisfont une condition, même futures ; avec le 2PL, il rend l'isolation sérialisable.
- Exact mais lent : chaque écriture doit être comparée à tous les prédicats actifs.
- Les verrous de plage d'index l'approchent par une entrée ou une plage d'index : plus large, donc sûr, et bien moins cher.
- Sans index adapté : verrou partagé sur toute la table.
