---
id: grails-ch02-l01
title: "Propriétés : qui répond vraiment à obj.name"
source: { book: groovy-in-action, chapter: 7, pages: "165-168, 187-194" }
duration_min: 35
concepts:
  - id: grails-prop-inside-outside
    label: "Hors de la classe, obj.name appelle le getter ; dans le corps de la classe, name et this.name lisent le champ"
  - id: grails-prop-closure-getter
    label: "Dans une closure, même écrite dans la classe, un nom de propriété repasse par le getter ou le setter"
  - id: grails-prop-direct-field
    label: "obj.@name lit ou écrit le champ sans passer par l'accesseur"
  - id: grails-prop-readonly-derived
    label: "Propriété final (lecture seule), propriété calculée (getter sans champ) et booléen (isX et getX)"
  - id: grails-prop-resolution-chain
    label: "La chaîne de résolution de obj.name : clé de map, getProperty redéfini, accesseur ou champ, get(String), propertyMissing"
  - id: grails-prop-dirty-checking
    label: "GORM détecte les modifications par les setters : écrire le champ directement échappe au dirty checking"
glossary:
  - term: "accesseur"
    definition: "Getter (getName, ou isName pour un booléen) ou setter (setName) qui lit ou écrit une propriété."
  - term: "champ de stockage"
    definition: "Le champ privé que Groovy génère derrière une propriété pour garder sa valeur."
  - term: "propriété calculée"
    definition: "Propriété sans champ : un getter qui calcule sa valeur à chaque lecture (getLabel → obj.label)."
  - term: "dirty checking"
    definition: "Mécanisme par lequel GORM et Hibernate repèrent les propriétés modifiées pour n'écrire que celles-là en base."
visuals: [grails-ch02-property-lookup]
labs: [grails-ch02-l01-lab-warmup-account, grails-ch02-l01-lab-ticket-close]
extra: false
xp: 30
checkpoints:
  - id: c1
    type: code-output
    prompt: "Le getter de `Price` arrondit. Qu'affiche ce script ?"
    code: |
      class Price {
          BigDecimal amount
          BigDecimal getAmount() { amount.setScale(0, java.math.RoundingMode.HALF_UP) }
          String raw() { "brut ${amount}" }
      }
      def p = new Price(amount: 9.6)
      println p.amount
      println p.raw()
    answer: "10\nbrut 9.6"
    explanation: "Hors de la classe, p.amount appelle getAmount (arrondi à 10). Dans le corps de raw(), amount désigne le champ : on lit la valeur brute, sans passer par le getter."
    concept: grails-prop-inside-outside
  - id: c2
    type: code-output
    prompt: "Même classe, mais le getter compte ses appels. Qu'affiche ce script ?"
    code: |
      class Tag {
          String name
          int reads = 0
          String getName() { reads++; name }
          int twice() { [1, 2].each { name }; reads }
      }
      def t = new Tag(name: 'groovy')
      println t.twice()
    answer: "2"
    explanation: "La closure est une autre classe : `name` y est résolu par son owner, comme depuis l'extérieur, donc via getName(). Deux tours de each, deux appels du getter."
    concept: grails-prop-closure-getter
  - id: c3
    type: single
    prompt: "Que vaut `[name: 'Ada', age: 36].class` ?"
    choices:
      - "class java.util.LinkedHashMap"
      - "null"
      - "Une MissingPropertyException"
      - "class groovy.lang.MapWithDefault"
    answer: 1
    explanation: "Sur une Map, la clé gagne avant tout : map.class cherche la clé « class », absente, donc null. Pour la classe d'une map, écris map.getClass()."
    concept: grails-prop-resolution-chain
---

## Pourquoi c'est important

Dans une app Grails, un ticket de support se ferme par une méthode du domaine :

```groovy title="Ticket.groovy"
class Ticket {
    String title
    String status = 'OPEN'

    void close() { status = 'CLOSED' }
}
```

Le service appelle `ticket.close()`, puis `ticket.save()`. Le test unitaire de `close()` passe, et aucune exception n'apparaît en production. Pourtant, en base, le ticket reste `OPEN`, pour toujours.

Le coupable n'est ni Hibernate ni la transaction : c'est une règle de Groovy sur les propriétés. Dans le corps de la classe, `status = …` écrit **le champ** directement, sans appeler `setStatus`. Or GORM repère les modifications grâce aux setters. Sans setter appelé, rien n'est marqué comme modifié, et rien n'est écrit en base. Nous l'avons vérifié sur GORM 7.2 : après `close()` puis `save(flush: true)`, `isDirty('status')` vaut `false` et la ligne garde `OPEN`.

Cette leçon t'apprend à prédire exactement qui répond quand tu écris `obj.name`. C'est la base de tout ce que Grails fait avec tes objets : data binding, dirty checking, rendu JSON.

## Rappel : une propriété, c'est trois choses

Au module 00, tu as vu qu'un champ déclaré sans modificateur de visibilité devient une **propriété** :

```groovy
class Account { String email }
```

`groovyc` génère trois choses : un champ privé `email` (le **champ de stockage**), `getEmail()` et `setEmail(String)`. Si tu écris toi-même l'un des accesseurs, Groovy garde le tien et ne génère que l'autre.

La question de cette leçon : quand tu écris `email`, `this.email` ou `account.email`, passes-tu par l'accesseur ou par le champ ? La réponse dépend de **l'endroit où le code est écrit**.

## Dehors, le getter ; dedans, le champ

La règle tient en deux lignes :

- **Hors de la classe**, `account.email` est un appel à `getEmail()`, et `account.email = x` un appel à `setEmail(x)`.
- **Dans le corps de la classe** qui déclare le champ, `email` et `this.email` désignent **le champ** directement.

```groovy
class Account {
    String email
    void setEmail(String e) { email = e?.trim()?.toLowerCase() }   // (1)
    String getEmail() { email }                                     // (2)
}

def a = new Account()
a.email = '  Ana@Mail.IO '   // appelle setEmail
assert a.email == 'ana@mail.io'
```

Regarde les lignes (1) et (2) : si `email`, à l'intérieur du setter, appelait le setter, il s'appellerait lui-même à l'infini. C'est justement pour ça que la règle existe : **dans sa propre classe, un nom de champ désigne le champ**. Les accesseurs peuvent ainsi lire et écrire leur valeur sans boucle.

Le revers, c'est le bug du ticket : une méthode métier de la classe qui écrit `status = 'CLOSED'` contourne `setStatus`, et toute logique placée dans le setter avec elle.

::checkpoint{id="c1"}

## Dans une closure, retour au getter

Voici la nuance que presque tout le monde rate. Une closure est compilée en **une autre classe** (`Ticket$_close_closure1`). Quand elle utilise `status`, ce nom n'est pas un champ de la closure : elle le cherche par son **owner** (module 01), exactement comme du code extérieur. Résultat : dans une closure, même écrite au milieu de la classe, un nom de propriété **repasse par le getter ou le setter**.

```groovy
class Ticket {
    String status = 'OPEN'
    void setStatus(String s) { println "setStatus($s)"; status = s }

    void closeDirect()    { status = 'CLOSED' }                // champ : pas de setter
    void closeInClosure() { [1].each { status = 'CLOSED' } }   // setter appelé
}
```

C'est pour ça que le même code « marche » dans un `each` et « ne marche pas » une ligne plus haut. Ce n'est pas un hasard : c'est la règle de compilation, que tu peux maintenant prédire.

::checkpoint{id="c2"}

## `.@` : le champ, depuis n'importe où

Il arrive qu'on veuille l'inverse : lire le champ **sans** passer par un getter qui calcule ou trace. L'opérateur `.@` fait ça :

```groovy
class Doubler {
    def value
    def getValue() { value * 2 }
}
def d = new Doubler(value: 100)
assert d.value  == 200   // getter
assert d.@value == 100   // champ
```

`obj.@champ` fonctionne en lecture comme en écriture. C'est un outil de test ou de débogage, pas un style : si ton code de production a besoin de `.@`, c'est souvent que ton getter fait trop de choses.

## Lecture seule, calculée, booléenne

Trois variantes que tu croiseras dans tous les domaines Grails :

```groovy
class Member {
    final String id = UUID.randomUUID().toString()  // final : getter seul, pas de setter
    String first, last
    boolean admin                                   // getAdmin() ET isAdmin()

    String getFullName() { "$first $last" }         // calculée : getter sans champ
}

def m = new Member(first: 'Ada', last: 'Lovelace')
assert m.fullName == 'Ada Lovelace'
assert m.isAdmin() == false
m.id = 'x'      // ReadOnlyPropertyException
```

- `final` : la propriété est en **lecture seule**. L'affecter hors de la classe lève `ReadOnlyPropertyException`.
- Un getter sans champ crée une **propriété calculée**. Elle apparaît dans `m.properties` et dans le JSON de Grails. Dans un domaine GORM, elle n'est **pas** une colonne, à condition de n'avoir **pas de setter** (un getter + un setter = une propriété persistante, tu le reverras au module 13).
- Pour un `boolean`, Groovy 4 génère `isAdmin()` **et** `getAdmin()`.

## La chaîne complète de résolution

`obj.name` ne veut pas dire la même chose pour tous les objets. Pour un accès dynamique (hors de la classe, ou dans une closure), Groovy essaie dans l'ordre :

1. **`obj` est une `Map`** : c'est la clé `name`, point. Même `map.class` cherche une clé `class`, et renvoie donc `null`.
2. **`getProperty(String)` redéfini** : un objet Groovy peut intercepter **tous** ses accès de propriété, même à une propriété qui existe et a un getter (tu l'exploiteras au module 03, MOP).
3. **Sinon, la `MetaClass`** (c'est ce que fait le `getProperty` par défaut) : le getter s'il existe, sinon le champ accessible.
4. **`get(String)`** : un dernier recours, consulté seulement si aucune propriété ne porte ce nom.
5. **`propertyMissing(String)`**, sinon une `MissingPropertyException`.

Dans le corps de la classe, la règle du champ passe avant tout : si le champ est déclaré là, `name` le lit directement, même quand `getProperty` est redéfini.

Choisis un objet et l'endroit d'où tu lis `name`, et regarde quel maillon répond :

::visual{id="grails-ch02-property-lookup"}

::checkpoint{id="c3"}

> **Astuce :** `params` dans un contrôleur Grails est une Map. `params.id` est donc une clé, jamais une propriété, et `params.class` vaut `null` comme toute clé absente.

## `properties` : toutes les propriétés d'un coup

Chaque objet a une propriété `properties`, une Map `nom → valeur` de ses propriétés lisibles :

```groovy
assert m.properties.keySet().containsAll(['first', 'last', 'admin', 'fullName', 'id', 'class'])
```

Elle contient `class` (le `getClass()` de Java), les propriétés **calculées** et, en Groovy 4, **tous les champs, même privés**.

> **Au-delà du livre** : *Groovy in Action* (Groovy 2.4) montre qu'un champ `public` n'apparaît pas dans `properties`. En Groovy 4, champs publics, protégés et privés y apparaissent tous (vérifié sur Groovy 4.0.33). Conséquence : `render(user.properties as JSON)` expose aussi le hash du mot de passe. Pour une sortie publique, construis explicitement la Map des champs autorisés. Grails l'utilise dans les deux sens : `obj.properties` pour lire, et `obj.properties = params` pour **lier** une requête HTTP à un objet (le data binding que tu as reconstruit au projet du module 00).

> **Attention :** `user.properties = params` affecte **toute** propriété que la requête nomme. Si `User` a une propriété `admin`, un attaquant envoie `admin=true`. En Grails, protège ces propriétés avec la contrainte `bindable: false` ou lie seulement une liste blanche (`bindData(user, params, [include: ['email', 'name']])`). Tu le traiteras en détail au module 17 (Spring Security et OWASP).

## Sous le capot : ce que génère `groovyc`

Compile `Account` et regarde le bytecode avec `javap -p Account` : tu verras `private String email`, `public String getEmail()` et `public void setEmail(String)`. Pour Java, une classe Groovy est un JavaBean normal, et c'est pour ça que Spring, Jackson ou Hibernate la manipulent sans rien savoir de Groovy.

La règle dedans/dehors vient de la façon dont chaque accès est compilé :

- dans le corps de la classe qui déclare le champ, `email` est compilé en accès direct au champ (une instruction `GETFIELD`/`PUTFIELD`), comme en Java ;
- partout ailleurs, y compris dans une closure (qui est une classe à part), `obj.email` devient un **site d'appel dynamique** : le runtime demande à la `MetaClass` de l'objet de résoudre la propriété, et la `MetaClass` préfère l'accesseur.

Côté GORM, la transformation AST des entités ajoute le trait `DirtyCheckable` et **réécrit chaque setter** pour qu'il appelle `markDirty('status', nouvelleValeur, ancienneValeur)` avant d'affecter. Au `flush`, Hibernate n'écrit que les propriétés marquées. Un `PUTFIELD` direct ne passe pas par ce setter : rien n'est marqué, et la valeur modifiée en mémoire n'est jamais envoyée en base. D'où le correctif du ticket : `void close() { setStatus('CLOSED') }`, ou `this.setStatus(…)`.

## Pièges fréquents

- **Écrire un champ dans une méthode d'un domaine GORM** (`status = 'CLOSED'`) : la modification n'est pas détectée. Passe par le setter.
- **Croire que `this.name` appelle le getter** : dans la classe, c'est le champ, `this` ou pas.
- **Être surpris qu'une closure appelle le getter** : elle résout le nom par son owner, comme du code extérieur.
- **`map.class` pour connaître le type d'une map** : renvoie `null` ; utilise `getClass()`.
- **Un getter coûteux ou qui a des effets de bord** : Grails l'appelle pour le rendu JSON, le data binding et `properties`.
- **`obj.properties = params` sans liste blanche** : affectation de masse, faille classique.
- **Envoyer `obj.properties` à un client** : en Groovy 4, elle contient aussi les champs privés.

## À retenir

- Dehors : `obj.name` = accesseur. Dedans : `name` et `this.name` = champ. Dans une closure : accesseur.
- `obj.@name` court-circuite l'accesseur, en lecture comme en écriture.
- `final` = lecture seule ; getter sans champ = propriété calculée ; booléen = `isX()` et `getX()`.
- Résolution dynamique : clé de Map, `getProperty` redéfini, puis accesseur ou champ, `get(String)` et `propertyMissing`.
- GORM détecte les changements par les setters : dans un domaine, appelle le setter.

> **Source :** *Groovy in Action*, 2e éd., sections 7.1.1 et 7.4 (pages 165 à 168 et 187 à 194). Le comportement de GORM est vérifié sur Grails 7.2.4.
