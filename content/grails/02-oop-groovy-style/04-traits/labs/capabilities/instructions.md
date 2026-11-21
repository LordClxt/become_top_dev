## Contexte

Minigrails veut offrir à ses entités ce que GORM offre aux siennes : un horodatage automatique, un journal d'audit, une validation avant écriture, la suppression logique. Chaque capacité est un **trait**, et `save()` traverse ces traits comme une pile. `Store.groovy` (un faux stockage avec une horloge réglable) et `Persistent.groovy` (le `save()` de base) sont fournis : ne les modifie pas.

## Les traits à écrire

**`Timestamped`** : propriétés `Date dateCreated` et `Date lastUpdated`. Son `save()` fixe `dateCreated` au premier enregistrement seulement, met `lastUpdated` à `Store.now` à chaque fois, puis continue la chaîne.

**`Audited`** :
- exige de la classe une méthode `String getAuditName()` (abstraite dans le trait) ;
- propriété `List<String> auditLog`, propre à chaque instance ;
- propriété `int saveCount` ;
- son `save()` continue la chaîne **d'abord**, puis, si l'enregistrement a réussi (le résultat commence par `saved`), ajoute `"saved <auditName>"` au journal et augmente `saveCount`.

**`Validated`** : exige `boolean isValid()`. Son `save()` renvoie `'refusé'` **sans continuer la chaîne** si l'objet est invalide, sinon continue.

**`SoftDeletable`** : propriétés `boolean deleted` et `Date deletedAt` ; `softDelete()` passe `deleted` à `true` et fixe `deletedAt` à `Store.now` ; `isActive()` renvoie l'inverse de `deleted`. Ce trait ne touche pas à `save()`.

## La classe

**`Ticket`** (propriété `String title`) implémente les cinq traits. Un ticket est valide si son titre n'est pas vide. Son nom d'audit est `ticket 'Imprimante'`.

Choisis **l'ordre** de la liste `implements` : un ticket invalide ne doit recevoir **ni** horodatage, **ni** entrée d'audit, **ni** identifiant.

## Bonus vérifié par les tests

Un objet existant d'une classe sans aucun trait (`Note`, défini dans les tests) doit pouvoir être supprimé logiquement grâce à `withTraits(SoftDeletable)`.
