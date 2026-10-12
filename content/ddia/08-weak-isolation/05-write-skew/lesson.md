---
id: ddia-ch08-l05
title: Write skew et fantômes
source:
  chapter: 7
  pages: 246-251
duration_min: 45
concepts:
- id: ddia-write-skew
  label: 'Write skew : deux transactions lisent les mêmes objets puis en modifient des différents ; une condition vraie à la lecture ne l''est
    plus après les deux'
- id: ddia-write-skew-defense
  label: 'Défenses limitées : pas d''opération atomique, pas de détection automatique ; contraintes multi-objets ou verrouillage explicite des
    lignes lues'
- id: ddia-write-skew-examples
  label: 'Exemples : médecins de garde, réservation de salle, partie multijoueur, nom d''utilisateur, double dépense'
- id: ddia-phantom
  label: 'Fantôme : une écriture change le résultat d''une recherche d''une autre transaction ; SELECT FOR UPDATE ne peut pas verrouiller l''absence
    de lignes'
- id: ddia-materializing-conflicts
  label: 'Matérialiser les conflits : créer des lignes de verrou (créneaux × salles) ; dernier recours, la sérialisabilité est préférable'
glossary:
- term: write skew
  definition: 'Anomalie : deux transactions lisent les mêmes objets, puis chacune en met à jour un différent ; ni écriture sale, ni mise à jour
    perdue.'
- term: fantôme (phantom)
  definition: L'écriture d'une transaction change le résultat d'une recherche d'une autre transaction.
- term: matérialiser les conflits
  definition: Transformer un fantôme en conflit de verrou sur un ensemble concret de lignes créées à l'avance.
visuals: []
labs:
- ddia-ch08-l05-lab-write-skew-design
- ddia-ch08-l05-lab-materialize-design
extra: false
xp: 45
---

## Pourquoi c'est important

On a vu les écritures sales et les mises à jour perdues, deux conditions de course quand des transactions écrivent les **mêmes objets**. Il y a des cas plus subtils où des transactions concurrentes **écrivent des objets différents** et pourtant violent une règle métier. C'est le **write skew** : un bug réel, que ni read committed ni l'isolation par instantané n'empêchent, et qui motive la sérialisabilité (module 09).

## Un exemple : les médecins de garde

Une application gère les gardes d'un hôpital. Il faut **au moins un médecin** de garde par créneau. Les médecins peuvent abandonner leur garde, à condition qu'au moins un collègue reste. Alice et Bob sont les deux médecins de garde. Tous deux se sentent mal et demandent à partir **à peu près en même temps**.

Dans chaque transaction, l'application vérifie d'abord que **deux médecins ou plus** sont de garde ; si oui, elle suppose qu'il est sûr d'en retirer un. Avec l'isolation par instantané, les deux vérifications renvoient 2, donc les deux transactions poursuivent : Alice met à jour son propre enregistrement, Bob le sien. Les deux valident : **plus aucun médecin de garde**. La contrainte est violée.

### Caractériser le write skew

Cette anomalie est le **write skew**. Ce n'est **ni** une écriture sale **ni** une mise à jour perdue, car les transactions mettent à jour deux objets différents (l'enregistrement d'Alice et celui de Bob). Le conflit est moins évident, mais c'est bien une condition de course : si elles s'étaient exécutées l'une après l'autre, la seconde aurait été empêchée de partir. Le comportement anormal n'était possible que parce que les transactions étaient **concurrentes**.

On peut voir le write skew comme une **généralisation** de la mise à jour perdue : il peut se produire quand deux transactions **lisent les mêmes objets**, puis en mettent à jour certains (des différents). Dans le cas particulier où elles mettent à jour le **même** objet, on obtient une écriture sale ou une mise à jour perdue, selon le timing.

### Les défenses sont plus limitées

- les **opérations atomiques** sur un objet n'aident pas : plusieurs objets sont impliqués ;
- la **détection automatique** des mises à jour perdues de certaines implémentations ne détecte pas non plus le write skew (ni dans PostgreSQL, MySQL/InnoDB, Oracle, SQL Server) ; seule une **vraie sérialisabilité** l'empêche automatiquement ;
- certaines bases permettent des **contraintes**, mais « au moins un médecin de garde » est une contrainte sur plusieurs objets, rarement supportée ; on peut la simuler avec des déclencheurs ou des vues matérialisées ;
- à défaut de sérialisabilité, la deuxième meilleure option est de **verrouiller explicitement les lignes dont la transaction dépend** :

```sql
BEGIN TRANSACTION;
SELECT * FROM doctors
  WHERE on_call = true AND shift_id = 1234 FOR UPDATE;
UPDATE doctors SET on_call = false
  WHERE name = 'Alice' AND shift_id = 1234;
COMMIT;
```

## D'autres exemples

Une fois qu'on connaît le write skew, on le voit partout :

- **réservation de salle** : on vérifie qu'aucune réservation ne chevauche (`SELECT COUNT(*)`), puis on insère. L'isolation par instantané n'empêche pas un autre utilisateur d'insérer en parallèle une réservation conflictuelle ;
- **partie multijoueur** : le verrou empêche deux joueurs de déplacer la *même* figure (mise à jour perdue), mais pas de déplacer deux figures *différentes* à la même case ;
- **nom d'utilisateur** : deux utilisateurs créent le même nom en même temps. Heureusement, une **contrainte d'unicité** règle le problème (la seconde transaction est annulée) ;
- **double dépense** : insérer une dépense provisoire, lister les éléments du compte et vérifier que la somme est positive ; avec le write skew, deux dépenses concurrentes peuvent rendre le solde négatif sans que l'une voie l'autre.

### Les fantômes

Tous ces exemples ont le même schéma :

1. un `SELECT` vérifie une condition en cherchant des lignes qui correspondent (au moins deux médecins, pas de réservation, la case est libre, le nom n'est pas pris, il reste de l'argent) ;
2. selon le résultat, l'application décide de continuer ou d'abandonner ;
3. si elle continue, elle fait une écriture (`INSERT`, `UPDATE`, `DELETE`) et valide.

L'effet de cette écriture **change la condition** de l'étape 2 : si on répétait le `SELECT` après le commit, il renverrait un résultat différent. Pour les médecins, la ligne modifiée était l'une des lignes lues, donc `SELECT FOR UPDATE` suffit. Mais les quatre autres cas **vérifient l'absence de lignes** correspondant à une condition, et l'écriture **ajoute** une ligne correspondant à la même condition. Si la requête ne renvoie aucune ligne, `SELECT FOR UPDATE` n'a **rien à verrouiller**. Cet effet, où l'écriture d'une transaction change le résultat d'une recherche d'une autre, s'appelle un **fantôme**. L'isolation par instantané évite les fantômes pour les requêtes en lecture seule, mais dans les transactions lecture-écriture, ils mènent à des write skews particulièrement retors.

### Matérialiser les conflits

Si le problème est qu'**aucun objet** ne peut porter le verrou, on peut **introduire artificiellement un objet à verrouiller**. Pour la réservation de salle : créer à l'avance une table de créneaux (une ligne par salle et par période de 15 minutes, pour les six prochains mois). Une transaction qui veut réserver verrouille (`SELECT FOR UPDATE`) les lignes de la table correspondant à la salle et à la période, puis vérifie les chevauchements et insère comme avant. Cette table ne stocke aucune information sur la réservation : elle n'est qu'une **collection de verrous**.

Cette approche s'appelle **matérialiser les conflits** : elle transforme un fantôme en conflit de verrou sur un ensemble concret de lignes. Mais il peut être difficile et source d'erreurs de trouver comment matérialiser, et c'est laid de laisser un mécanisme de contrôle de concurrence **fuir dans le modèle de données**. C'est un **dernier recours**. Un niveau d'isolation sérialisable est de loin préférable dans la plupart des cas.


## Pièges fréquents

- **Vérifier une condition puis écrire, avec l'isolation par instantané** : le write skew est silencieux.
- **Croire que `FOR UPDATE` suffit pour un `SELECT` qui ne renvoie rien.**
- **Oublier les contraintes simples** (unicité) qui règlent certains cas.
- **Matérialiser les conflits par défaut** au lieu de demander la sérialisabilité.

## À retenir

- Write skew : lire les mêmes objets, écrire des objets différents, invariant violé.
- Ni opération atomique ni détection automatique : verrous explicites, contraintes, ou sérialisabilité.
- Fantôme : l'écriture change le résultat d'une recherche ; il n'y a rien à verrouiller.
- Matérialiser les conflits : dernier recours.
