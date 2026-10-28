---
id: arch-ch01-l03
title: "La connascence"
source: { chapter: 3, pages: "68-73" }
duration_min: 45
concepts:
  - id: arch-connascence-def
    label: "Deux composants sont connascents si changer l'un oblige à modifier l'autre"
  - id: arch-static-connascence
    label: "Connascence statique : nom, type, sens (convention), position, algorithme"
  - id: arch-dynamic-connascence
    label: "Connascence dynamique : exécution, timing, valeurs, identité"
  - id: arch-connascence-properties
    label: "Force, localité et degré d'une connascence"
  - id: arch-connascence-rules
    label: "Règles de Page-Jones et de Weirich : affaiblir, et d'autant plus que la distance augmente"
  - id: arch-connascence-limits
    label: "La connascence regarde le code de près ; elle ne dit rien du synchrone vs asynchrone"
glossary:
  - term: "connascence"
    definition: "Relation entre deux composants telle que changer l'un oblige à modifier l'autre pour que le système reste correct (Meilir Page-Jones, 1996)."
  - term: "connascence statique"
    definition: "Couplage visible dans le code source : nom, type, sens, position, algorithme."
  - term: "connascence dynamique"
    definition: "Couplage qui n'apparaît qu'à l'exécution : ordre d'exécution, timing, valeurs liées, identité partagée."
  - term: "force"
    definition: "La difficulté à refactorer une connascence ; les formes statiques sont plus faibles (plus faciles) que les dynamiques."
  - term: "localité"
    definition: "La proximité des éléments connascents : dans la même fonction, le même module, ou des services différents."
  - term: "degré"
    definition: "Le nombre d'éléments touchés par une connascence."
visuals: [arch-ch01-connascence-ladder]
labs: [arch-ch01-l03-lab-name-the-connascence, arch-ch01-l03-lab-swapped-seats]
xp: 45
---

## Pourquoi c'est important

Un matin, le service de réservation affiche « **14D** » comme nom de passager et « **Ford, N** » comme siège. Aucune erreur de compilation, aucun test rouge : les deux paramètres sont des `string`. Quelqu'un a simplement inversé l'ordre des arguments d'une fonction appelée depuis un autre module.

Le couplage afférent et efférent dit **combien** de liens existent. Il ne dit pas **de quelle nature** ils sont, ni lesquels vont mordre. La **connascence**, définie par Meilir Page-Jones en 1996, donne ce vocabulaire : une échelle des formes de couplage, de la plus inoffensive à la plus dangereuse, et des règles pour les affaiblir.

> **Définition** : deux composants sont **connascents** si un changement dans l'un oblige à modifier l'autre pour que le système reste correct.

## Connascence statique : visible dans le code

C'est un raffinement du couplage afférent/efférent : elle se lit dans le code source, donc les outils peuvent la trouver. Du plus faible au plus fort :

- **De nom (CoN)** : plusieurs composants doivent s'accorder sur le **nom** d'une entité. C'est la forme la plus courante et la plus souhaitable : un outil de refactoring renomme partout en une seconde.
- **De type (CoT)** : ils doivent s'accorder sur le **type** d'une entité (`amount: number`).
- **De sens / de convention (CoM)** : ils doivent s'accorder sur la **signification d'une valeur**. Le cas typique : les nombres magiques. `status === 2` veut dire « payé » dans un module… et « expédié » dans un autre ? Imagine aussi quelqu'un qui inverse `TRUE = 1` et `FALSE = 0`.
- **De position (CoP)** : ils doivent s'accorder sur l'**ordre** des valeurs. `updateSeat(name, seat)` appelé avec `updateSeat('14D', 'Ford, N')` : types justes, sens faux.
- **D'algorithme (CoA)** : ils doivent s'accorder sur un **algorithme**. Un hachage calculé côté client et côté serveur pour s'authentifier : changer un détail d'un côté casse la poignée de main.

## Connascence dynamique : visible seulement à l'exécution

- **D'exécution (CoE)** : l'**ordre** d'exécution compte.

  ```typescript
  const email = new Email();
  email.setRecipient('foo@example.com');
  email.setSender('me@example.com');
  email.send();
  email.setSubject('oups'); // trop tard : le message est parti sans sujet
  ```
- **De timing (CoT)** : le **moment** compte. L'exemple type : une *race condition* entre deux exécutions concurrentes.
- **De valeurs (CoV)** : plusieurs valeurs sont liées et doivent **changer ensemble**. Un rectangle défini par ses quatre coins : on ne peut pas bouger un coin sans les autres. Le cas le plus grave en architecture : une même valeur répartie dans **plusieurs bases** qui doivent toutes être mises à jour, ou aucune (la transaction distribuée).
- **D'identité (CoI)** : plusieurs composants doivent référencer **la même instance**, par exemple deux composants qui partagent et modifient une même file distribuée.

Les formes dynamiques sont plus difficiles à repérer : on sait analyser un graphe d'appels, beaucoup moins le comportement à l'exécution.

## Trois propriétés pour juger

- **Force** : la facilité à refactorer. Préfère le **statique** au dynamique. Et dans le statique, remonte l'échelle : une connascence de sens se transforme en connascence de **nom** en remplaçant le nombre magique par une constante nommée.
- **Localité** : la **proximité** des éléments. Une connascence forte à l'intérieur d'une même fonction est acceptable ; la même entre deux services est dangereuse. Force et localité se jugent **ensemble**.
- **Degré** : le **nombre** d'éléments touchés. Une connascence dynamique entre deux modules est tolérable… mais les code bases grossissent, et le petit problème avec elles.

### Les règles

Page-Jones propose trois lignes directrices :

1. **Minimiser** la connascence globale en découpant le système en éléments encapsulés.
2. **Minimiser** celle qui **traverse** les frontières d'encapsulation.
3. **Maximiser** celle qui reste **à l'intérieur** des frontières.

Jim Weirich les a condensées en deux règles :

- **Règle du degré** : convertis les formes fortes en formes plus faibles.
- **Règle de localité** : plus les éléments sont éloignés, plus la forme de connascence doit être faible.

### Sous le capot : les refactorings types

Chaque forme a son remède, qui la fait **descendre** sur l'échelle :

```typescript
// Position → Nom : un objet d'options nommées.
function updateSeat(args: { passenger: string; seat: string }) { /* … */ }
updateSeat({ seat: '14D', passenger: 'Ford, N' }); // l'ordre ne compte plus

// Sens → Nom : une constante, ou mieux un type littéral.
const OrderStatus = { Paid: 'paid', Shipped: 'shipped' } as const;
type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

// Type faible → Type fort : un type « marqué » empêche de confondre deux string.
type SeatCode = string & { readonly __brand: 'SeatCode' };

// Exécution → Type : un constructeur qui exige tout ce qui est obligatoire.
class Email {
  constructor(readonly to: string, readonly from: string, readonly subject: string) {}
  send() { /* plus d'ordre à respecter */ }
}
```

Le système de types de TypeScript est un outil de **conversion de connascence** : chaque fois qu'il peut vérifier un accord, il le fait passer d'une convention implicite à un contrat explicite.

## Unifier couplage et connascence

Les deux vues se recouvrent : ce que Page-Jones appelle connascence statique, ce sont des degrés de couplage entrant ou sortant. Le couplage structuré compte les flèches ; la connascence dit **comment** elles tiennent. Ce que la programmation structurée appelait « couplage de données » (des appels de méthodes), la connascence dit comment il devrait se manifester.

### Les limites de la connascence des années 1990

1. Elle regarde le code **de très près** : c'est de l'hygiène de code plus que de la structure. L'architecte s'intéresse davantage à **comment** les modules sont couplés qu'au détail du couplage.
2. Elle ne répond pas à la question qui structure les systèmes distribués modernes : **synchrone ou asynchrone** ? Le module 04 (quanta) introduit une connascence à l'échelle de l'architecture pour combler ce manque.

::visual{id="arch-ch01-connascence-ladder"}

## Pièges fréquents

- **Croire que les types protègent de tout** : deux `string` à la suite laissent passer une connascence de position.
- **Les nombres et chaînes magiques partagés entre services** : une connascence de sens, à grande distance, la pire combinaison.
- **Les objets à configurer « dans le bon ordre »** : une connascence d'exécution que seul un test d'intégration attrapera.
- **Ignorer le degré** : une petite connascence forte devient un problème quand le code base grandit.

## À retenir

- **Connascents** : changer l'un oblige à changer l'autre.
- Statique (du plus faible au plus fort) : **nom, type, sens, position, algorithme**. Dynamique : **exécution, timing, valeurs, identité**.
- Juge **force, localité et degré** ensemble ; préfère le statique au dynamique.
- **Weirich** : affaiblis la connascence, et d'autant plus que les éléments sont éloignés.
- Elle ignore le synchrone vs asynchrone : on y reviendra avec les **quanta**.
