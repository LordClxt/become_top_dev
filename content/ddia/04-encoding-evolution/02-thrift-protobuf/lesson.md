---
id: ddia-ch04-l02
title: "Thrift et Protocol Buffers : des schémas et des numéros de champ"
source: { chapter: 4, pages: "116-121" }
duration_min: 35
concepts:
  - id: ddia-schema-binary-encoding
    label: "Un schéma permet d'omettre les noms de champs des octets et de générer du code"
  - id: ddia-field-tags
    label: "Le numéro de champ (tag) identifie chaque champ : on peut renommer un champ, jamais changer son tag"
  - id: ddia-varint
    label: "Entier de longueur variable : le bit de poids fort de chaque octet indique si la suite arrive"
  - id: ddia-protobuf-evolution
    label: "Ajouter un champ avec un nouveau tag ; seuls les champs optionnels ou à valeur par défaut peuvent être ajoutés ou retirés"
  - id: ddia-repeated-field
    label: "Protocol Buffers n'a pas de type liste mais un marqueur repeated : un champ optionnel peut devenir multivalué"
glossary:
  - term: "Thrift / Protocol Buffers"
    definition: "Bibliothèques d'encodage binaire fondées sur un schéma, nées à Facebook et à Google, rendues open source en 2007-2008."
  - term: "numéro de champ (field tag)"
    definition: "Nombre du schéma qui sert d'alias compact du champ dans les octets : 1, 2, 3."
  - term: "entier de longueur variable (varint)"
    definition: "Entier codé sur 1 à plusieurs octets selon sa valeur ; le bit de poids fort de chaque octet signale qu'un octet suit."
  - term: "génération de code"
    definition: "Outil qui transforme le schéma en classes d'un langage, que l'application appelle pour encoder et décoder."
visuals: []
labs: [ddia-ch04-l02-lab-tags-design]
xp: 35
---

## Pourquoi c'est important

Si tu connais le schéma d'un enregistrement, tu n'as pas besoin d'écrire « userName » dans chaque message : un petit numéro suffit. C'est l'idée de Thrift et de Protocol Buffers (*protobuf*), utilisés partout (gRPC repose sur protobuf). Mais ces numéros ont des règles d'évolution strictes : les connaître évite de casser un système en production.

## Un schéma, du code généré

Les deux bibliothèques exigent un **schéma** pour toute donnée encodée. Voici l'enregistrement de la leçon précédente en Thrift :

```
struct Person {
  1: required string       userName,
  2: optional i64          favoriteNumber,
  3: optional list<string> interests
}
```

et en Protocol Buffers :

```
message Person {
    required string user_name       = 1;
    optional int64  favorite_number = 2;
    repeated string interests       = 3;
}
```

Un outil de **génération de code** produit des classes dans le langage voulu ; l'application appelle ce code pour encoder et décoder.

## À quoi ressemblent les octets

Thrift a deux formats binaires. Le **BinaryProtocol** encode l'exemple en **59 octets** : chaque champ porte une annotation de type (chaîne, entier, liste…) et, si nécessaire, une longueur. Grande différence avec MessagePack : **plus de noms de champs**, mais des **numéros de champ** (1, 2, 3), ceux du schéma. Un numéro est un alias compact : il dit de quel champ on parle sans l'épeler.

Le **CompactProtocol**, équivalent sémantique, tient en **34 octets** : il range le type et le numéro dans un seul octet, et utilise des **entiers de longueur variable**. Pour 1337, au lieu de huit octets, on en utilise deux : le bit de poids fort de chaque octet dit s'il en reste d'autres. Les nombres de −64 à 63 tiennent sur un octet, ceux de −8 192 à 8 191 sur deux, etc.

Protocol Buffers (un seul format binaire) code le même enregistrement en **33 octets**, avec un empaquetage de bits légèrement différent.

Détail : `required` et `optional` ne changent **rien** aux octets (rien n'indique qu'un champ est obligatoire). Seule différence : `required` active une vérification à l'exécution, qui échoue si le champ n'est pas renseigné, utile pour détecter des bogues.

## Évolution du schéma et numéros de champ

Un enregistrement encodé est la **concaténation de ses champs**. Chaque champ est identifié par son numéro et annoté d'un type. Un champ non renseigné est simplement **omis**. Donc les numéros sont essentiels au sens des données :

- tu peux **renommer** un champ : les octets ne contiennent jamais son nom ;
- tu ne peux **jamais changer** le numéro d'un champ : toutes les données déjà encodées deviendraient invalides.

**Ajouter un champ** : donne-lui un **nouveau numéro**. Un ancien code qui lit une donnée écrite par le nouveau code rencontre un numéro inconnu : il l'**ignore**, et l'annotation de type lui dit combien d'octets sauter. Cela donne la **compatibilité ascendante** (l'ancien code lit le nouveau).

**Rétrocompatibilité** (le nouveau code lit l'ancien) : tant que chaque champ a un numéro unique, les numéros gardent leur sens. Un seul détail : un champ ajouté après le déploiement initial **ne peut pas être `required`**, sinon le nouveau code échouerait à lire les anciennes données qui ne l'ont pas écrit. Tout champ ajouté doit être **optionnel ou avoir une valeur par défaut**.

**Retirer un champ** : même logique, sens inversé. Seul un champ optionnel peut être retiré (jamais un `required`), et **on ne réutilise jamais son numéro** : des données écrites ailleurs peuvent encore le contenir, et le nouveau code doit continuer à l'ignorer.

### Changer le type d'un champ

C'est parfois possible (voir la documentation), au risque de **perdre en précision** ou de **tronquer**. Exemple : un entier 32 bits devient 64 bits. Le nouveau code lit sans souci les anciennes données (il complète avec des zéros). Mais l'ancien code, qui garde une variable de 32 bits, **tronque** une valeur écrite par le nouveau code si elle ne tient pas.

### Le cas de `repeated`

Protocol Buffers n'a **pas de type liste**, mais un marqueur `repeated` (troisième option à côté de `required` et `optional`). L'encodage d'un champ répété est simplement : **le même numéro apparaît plusieurs fois**. Conséquence agréable : on peut transformer un champ optionnel (une valeur) en champ répété (plusieurs). Le nouveau code lisant d'anciennes données voit une liste de zéro ou un élément ; l'ancien code lisant de nouvelles données ne voit que **le dernier élément**.

Thrift a un type liste dédié, paramétré par le type de ses éléments. Cela interdit cette évolution, mais permet les listes imbriquées.

## Pièges fréquents

- **Renuméroter les champs** « pour faire propre » : toutes les données stockées deviennent illisibles.
- **Réutiliser le numéro d'un champ supprimé** : d'anciennes données portent encore l'ancien sens de ce numéro.
- **Ajouter un champ `required`** : les anciennes données ne l'ont pas, et le nouveau code refuse de les lire.
- **Élargir un entier sans réfléchir à l'ancien code** : il tronque.

## À retenir

- Le schéma remplace les noms de champs par des numéros : 59 octets (Thrift binaire), 34 (Thrift compact), 33 (protobuf) contre 66 (MessagePack) et 81 (JSON).
- Renomme un champ si tu veux, mais jamais son numéro ; n'en réutilise jamais un.
- Tout champ ajouté plus tard est optionnel ou a une valeur par défaut ; l'ancien code ignore les numéros inconnus.
- `repeated` permet de passer d'une valeur à une liste ; l'ancien code ne voit que le dernier élément.
