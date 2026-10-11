---
id: ddia-ch08-l05
title: "Write skew et fantômes"
source: { chapter: 7, pages: "246-251" }
duration_min: 40
concepts:
  - id: ddia-write-skew-anomaly
    label: "Write skew : deux transactions lisent les mêmes objets puis écrivent des objets différents, et l'invariant qu'elles vérifiaient est violé"
  - id: ddia-write-skew-examples
    label: "Exemples : médecins de garde, réservation de salle, pièces d'un jeu, nom d'utilisateur, double dépense"
  - id: ddia-write-skew-check-then-act
    label: "Le motif : un SELECT vérifie une condition, l'application décide, puis une écriture change cette condition"
  - id: ddia-phantom-writes
    label: "Fantôme : une écriture d'une transaction change le résultat d'une recherche d'une autre ; rien à verrouiller quand la ligne n'existe pas encore"
  - id: ddia-materialize-conflicts
    label: "Matérialiser les conflits : créer d'avance des lignes (créneaux) à verrouiller ; efficace mais dernier recours"
glossary:
  - term: "write skew"
    definition: "Anomalie où deux transactions concurrentes lisent les mêmes données puis modifient des objets différents, en violant ensemble une règle que chacune respectait seule."
  - term: "fantôme (phantom)"
    definition: "Effet où une écriture d'une transaction change le résultat d'une requête de recherche d'une autre transaction."
  - term: "matérialiser les conflits"
    definition: "Transformer un fantôme en conflit de verrou sur des lignes concrètes créées exprès, par exemple une ligne par salle et par créneau."
  - term: "double dépense"
    definition: "Dépenser deux fois le même solde parce que deux transactions ont vérifié le solde avant que l'une ou l'autre écrive."
visuals: []
labs: [ddia-ch08-l05-lab-booking-materialize]
xp: 40
---

## Pourquoi c'est important

Jusqu'ici, chaque anomalie touchait **un même objet** : une écriture sale, une mise à jour perdue. Les parades (verrou de ligne, opération atomique, détection automatique) agissaient toutes sur cet objet. Le **write skew** est plus sournois : deux transactions écrivent des objets **différents**, aucune ne touche ce que l'autre écrit, et le résultat est pourtant faux. Le snapshot isolation ne le voit pas. C'est l'anomalie qui justifie le chapitre suivant sur la sérialisabilité.

## Les médecins de garde

Un hôpital exige qu'**au moins un** médecin soit de garde pour chaque créneau. Un médecin peut quitter sa garde à condition qu'un collègue reste. Ce soir, Alice et Bob sont de garde pour le créneau 1234. Tous deux tombent malades et cliquent « quitter la garde » **au même moment**. Chaque clic lance cette transaction :

```sql
BEGIN TRANSACTION;
SELECT COUNT(*) FROM doctors
  WHERE on_call = true AND shift_id = 1234;
-- l'application vérifie : COUNT >= 2 ?
UPDATE doctors SET on_call = false
  WHERE name = 'Alice' AND shift_id = 1234;
COMMIT;
```

En snapshot isolation, les deux transactions lisent leur instantané : **2** médecins de garde. Chacune conclut qu'elle peut partir. Alice met à jour **sa** ligne, Bob **la sienne**. Les deux valident. Plus **aucun** médecin n'est de garde : l'exigence est violée.

## Caractériser le write skew

Ce n'est ni une écriture sale ni une mise à jour perdue : les deux transactions modifient **deux lignes différentes**. Le conflit est moins visible, mais c'est bien une condition de concurrence : exécutées l'une après l'autre, la seconde aurait vu un seul médecin et refusé.

Le write skew est une **généralisation** de la mise à jour perdue. Deux transactions lisent les mêmes objets, puis écrivent certains d'entre eux. Si elles écrivent le **même** objet, c'est une écriture sale ou une mise à jour perdue ; si elles écrivent des objets **différents**, c'est un write skew.

Les parades ont alors moins de prise :

- les **opérations atomiques** mono-objet ne servent à rien, puisque plusieurs objets sont en jeu ;
- la **détection automatique** des mises à jour perdues ne le voit pas non plus : ni le repeatable read de PostgreSQL ou de MySQL, ni le serializable d'Oracle, ni le snapshot isolation de SQL Server. Il faut une vraie **sérialisabilité** ;
- certaines bases permettent des **contraintes**, mais rarement sur plusieurs objets (« au moins un médecin de garde ») ; on peut parfois l'émuler avec des déclencheurs ou des vues matérialisées ;
- faute de sérialisabilité, la meilleure option est de **verrouiller explicitement** les lignes dont la décision dépend :

```sql
BEGIN TRANSACTION;
SELECT * FROM doctors
  WHERE on_call = true AND shift_id = 1234
  FOR UPDATE;
UPDATE doctors SET on_call = false
  WHERE name = 'Alice' AND shift_id = 1234;
COMMIT;
```

Ici, la transaction de Bob attend sur les mêmes lignes ; quand elle reprend, elle voit qu'Alice est partie.

## D'autres exemples

Le motif est partout dès qu'on y fait attention :

- **réservation de salle** : on vérifie qu'aucune réservation ne chevauche le créneau demandé, puis on insère. Deux personnes qui réservent la salle 123 de 12 h à 13 h en même temps passent toutes les deux. Le snapshot isolation ne l'empêche pas ; il faut la sérialisabilité ;
- **jeu à plusieurs** : un verrou empêche deux joueurs de déplacer la **même** pièce, mais pas de déplacer **deux pièces différentes** sur la même case ;
- **nom d'utilisateur** : deux personnes vérifient que `ada` est libre, puis créent chacune un compte `ada`. Ici, une **contrainte d'unicité** suffit : la seconde insertion échoue ;
- **double dépense** : un service vérifie que le solde reste positif, puis insère une dépense. Deux dépenses concurrentes de 80 € sur un solde de 100 € passent chacune la vérification : le solde finit à −60 €.

## Le motif lire-décider-écrire

Tous ces exemples suivent le même schéma :

1. un `SELECT` vérifie une **condition** (au moins deux médecins, aucune réservation qui chevauche, case libre, nom libre, solde suffisant) ;
2. selon le résultat, l'application **décide** de continuer ou non ;
3. elle **écrit** (`INSERT`, `UPDATE`, `DELETE`), et cette écriture **change la condition** de l'étape 1. Relancé après le commit, le même `SELECT` donnerait un autre résultat.

Les étapes peuvent même venir dans un autre ordre : écrire d'abord, puis vérifier et abandonner si la condition est violée.

## Les fantômes

Dans l'exemple des médecins, l'écriture de l'étape 3 modifie une ligne **renvoyée** par l'étape 1 : on peut donc la verrouiller avec `FOR UPDATE`. Mais dans les autres exemples, la condition porte sur l'**absence** de lignes : aucune réservation qui chevauche, aucun joueur sur la case, aucun compte nommé `ada`. Et l'écriture **ajoute** une ligne. Si le `SELECT` ne renvoie rien, `FOR UPDATE` n'a **rien à verrouiller**.

Cet effet, où une écriture d'une transaction change le résultat d'une recherche dans une autre, s'appelle un **fantôme** (*phantom*). Le snapshot isolation évite les fantômes dans les requêtes **en lecture seule** (l'instantané ne bouge pas), mais dans les transactions qui lisent **et** écrivent, les fantômes peuvent produire ces write skews.

## Matérialiser les conflits

Si le problème est qu'il n'y a pas d'objet à verrouiller, on peut en **créer** un. Pour la réservation de salles : une table `room_slots` avec une ligne par salle et par créneau de 15 minutes, remplie d'avance pour les six prochains mois. La transaction de réservation verrouille (`SELECT … FOR UPDATE`) les lignes des créneaux demandés, vérifie les chevauchements, puis insère la réservation. Ces lignes ne stockent **aucune information** : elles ne servent qu'à porter les verrous.

Un ordre de grandeur : 40 salles, 4 créneaux par heure, 12 heures par jour, 180 jours, cela fait 345 600 lignes. C'est peu pour une base, mais c'est une table à générer, à prolonger et à maintenir.

Cette technique transforme un fantôme en conflit de verrou sur un ensemble concret de lignes. Elle est **difficile** et **sujette aux erreurs**, et elle fait **fuir** un mécanisme de concurrence dans le modèle de données de l'application. C'est un **dernier recours**. Dans la plupart des cas, un niveau d'isolation **sérialisable** est bien préférable : c'est le sujet du chapitre suivant (exécution en série, verrouillage à deux phases, sérialisabilité par snapshot).

## Pièges fréquents

- **Croire que le snapshot isolation empêche tout** : il laisse passer le write skew, et Oracle l'appelle pourtant « serializable ».
- **Mettre `FOR UPDATE` sur une requête qui ne renvoie rien** : il n'y a rien à verrouiller, le fantôme passe.
- **Vérifier la disponibilité dans le navigateur ou dans un cache** : la vérification doit être dans la même transaction que l'écriture.
- **Matérialiser des conflits partout** : réservé aux cas où la sérialisabilité n'est pas disponible.
- **Oublier la contrainte d'unicité** pour les noms d'utilisateur : la solution la plus simple est souvent déclarative.

## À retenir

- Write skew : deux transactions lisent les mêmes objets puis écrivent des objets différents ; l'invariant tombe. Ni atomique, ni détection automatique, ni snapshot isolation ne l'empêchent.
- Motif : lire une condition, décider, écrire ce qui change la condition.
- Fantôme : l'écriture change le résultat d'une recherche ; quand la ligne n'existe pas encore, aucun verrou de ligne ne peut aider.
- Parades : sérialisabilité (chapitre suivant), verrou explicite sur les lignes lues, contrainte d'unicité, et en dernier recours matérialiser les conflits.
