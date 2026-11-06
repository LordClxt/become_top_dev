---
id: java-ch03-l04
title: "Le prix de l'immutabilité, et comment le payer moins cher"
source: { chapter: 4, pages: "83-86" }
duration_min: 35
concepts:
  - id: java-immutable-cost
    label: "Un objet par valeur distincte : modifier un bit d'un BigInteger d'un million de bits copie le million"
  - id: java-multistep-primitives
    label: "Fournir les opérations à plusieurs étapes comme primitives, pour ne créer qu'un objet au lieu d'un par étape"
  - id: java-mutable-companion
    label: "Compagnon mutable : package-private (MutableBigInteger) ou public (StringBuilder), à introduire seulement si la mesure l'exige"
  - id: java-minimize-state-space
    label: "Si la classe doit être mutable : champs final par défaut, objets complètement initialisés, pas de méthode de réinitialisation"
glossary:
  - term: "compagnon mutable"
    definition: "Classe mutable associée à une classe immuable, qui sert à construire efficacement une valeur en plusieurs étapes (StringBuilder pour String)."
  - term: "primitive à plusieurs étapes"
    definition: "Opération composée (exponentiation modulaire, plusieurs bits à la fois) offerte directement par la classe, qui peut alors la calculer sans objets intermédiaires."
  - term: "espace d'états"
    definition: "L'ensemble des états dans lesquels un objet peut se trouver ; plus il est petit, plus l'objet est facile à comprendre."
visuals: []
labs: [java-ch03-l04-lab-bits]
extra: false
xp: 30
---

## Pourquoi c'est important

Un service d'export construit un CSV de 50 000 lignes avec `csv = csv + ligne + "\n";` dans une boucle. En recette, 300 lignes, instantané. En production, l'export prend quatre minutes et le ramasse-miettes s'emballe : chaque `+` crée une **nouvelle** `String`, qui recopie tout ce qui précède. 50 000 itérations, une copie moyenne de 25 000 lignes chacune : plus d'un milliard de caractères recopiés pour un fichier de quelques mégaoctets. Le même code avec un `StringBuilder` prend quelques millisecondes.

L'immutabilité a un seul vrai défaut, et il faut savoir le reconnaître : **un objet distinct pour chaque valeur distincte**.

## Le concept

### Un objet par valeur

```java
BigInteger moby = …;            // un million de bits
moby = moby.flipBit(0);         // crée un nouveau BigInteger d'un million de bits

BitSet moby = …;
moby.flip(0);                   // modifie un bit, en temps constant
```

`flipBit` coûte un temps et une mémoire proportionnels à la taille du nombre, pour un seul bit changé. Le coût explose dans une **opération à plusieurs étapes** qui crée un objet par étape et les jette tous sauf le dernier, comme la concaténation en boucle.

### Première parade : des primitives à plusieurs étapes

Si tu sais quelles opérations composées les clients feront, offre-les **directement**. À l'intérieur, la classe immuable peut être aussi astucieuse qu'elle veut : elle travaille sur un tableau privé, puis ne crée qu'**un** objet final. `BigInteger.modPow(e, m)` calcule une exponentiation modulaire sans créer un `BigInteger` par multiplication : en interne, il utilise une classe compagnon mutable et package-private, `MutableBigInteger`. Tu n'as jamais à la manipuler, les auteurs du JDK l'ont fait pour toi.

```java
// Au lieu de laisser le client écrire bits.flip(3).flip(7).flip(12) (3 copies) :
public Bits flipAll(int... indexes) {
    long[] w = words.clone();                       // une seule copie
    for (int i : indexes) w[i >>> 6] ^= 1L << i;    // travail en place, sur le tableau privé
    return new Bits(w, size);
}
```

### Deuxième parade : un compagnon mutable public

Si tu ne peux pas prévoir les opérations, publie une classe **mutable** dédiée à la construction : `String` a `StringBuilder` (et son ancêtre synchronisé `StringBuffer`, obsolète). Le client accumule dans le compagnon, puis obtient la valeur immuable **une seule fois** :

```java
StringBuilder sb = new StringBuilder();
for (String line : lines) sb.append(line).append('\n');
String csv = sb.toString();         // une copie, à la fin
```

Une règle du livre : ne crée un compagnon mutable public **qu'après avoir mesuré** qu'il est nécessaire. La plupart des classes valeurs n'en ont jamais besoin.

Un compagnon a un piège de conception classique : `build()` (ou `toString()`) doit **copier** l'état, sinon la valeur « immuable » obtenue change quand le compagnon est réutilisé.

### Quand l'immutabilité est impossible : limiter la mutabilité

Certaines classes doivent changer d'état (une connexion, un compteur, un cache). Réduis alors leur **espace d'états** :

- chaque champ est `final` sauf raison impérieuse (combiné à la leçon 1 : **`private final` par défaut**) ;
- le constructeur (ou la fabrique) crée un objet **complètement initialisé**, invariants établis : pas de méthode `init()` publique séparée ;
- pas de méthode de **réinitialisation** (`reset`) qui permettrait de réutiliser l'objet comme s'il avait été construit autrement : un gain de performance négligeable pour beaucoup de complexité.

`CountDownLatch` est le modèle : mutable, mais à usage unique. On le crée, on décompte, et une fois à zéro il y reste ; impossible de le réarmer. Si tu as besoin d'une barrière réutilisable, c'est une autre classe (`CyclicBarrier`), avec un autre contrat.

## Sous le capot : la concaténation et `StringBuilder`

Depuis Java 9 (JEP 280), `a + b + c` ne compile plus en appels à `StringBuilder` : javac émet un `invokedynamic` vers `StringConcatFactory`, qui calcule la taille exacte du résultat et remplit **un seul** tableau. Une expression de concaténation est donc efficace. Mais **dans une boucle**, chaque itération est une expression séparée qui produit une nouvelle `String` complète : le coût reste quadratique. Le JIT ne transforme pas ta boucle en `StringBuilder`.

`StringBuilder` stocke un tableau qu'il agrandit au besoin : la nouvelle capacité vaut environ le double de l'ancienne plus 2. Comme la taille double, le nombre total de caractères recopiés au fil des agrandissements reste proportionnel à la taille finale : `append` coûte **O(1) amorti**. Si tu connais la taille finale, `new StringBuilder(capacity)` évite même ces recopies.

Depuis Java 9 également (JEP 254, *compact strings*), `String` et `StringBuilder` stockent un `byte[]` plus un `coder` : 1 octet par caractère tant que tout tient en Latin-1, 2 octets (UTF-16) sinon. Un seul caractère hors Latin-1 (un « € », un emoji) fait passer **tout** le tampon en UTF-16 et double sa taille. La plupart des chaînes d'une application prennent la moitié de la mémoire qu'elles prenaient en Java 8.

`StringBuilder.toString()` crée toujours une nouvelle `String` avec sa propre copie du tableau : le compagnon peut continuer à être modifié sans affecter les chaînes déjà produites. C'est exactement le contrat que doit respecter ton propre `build()`.

## Pièges fréquents

- **Concaténer dans une boucle** : quadratique, même avec `invokedynamic`.
- **Un `build()` qui partage l'état du compagnon** : la valeur immuable change quand on réutilise le builder.
- **Un compagnon mutable « au cas où »**, avant toute mesure.
- **`init()` et `reset()` publics** : des objets à moitié construits, des états impossibles à raisonner.
- **Rendre une classe mutable « pour la performance »** sans profilage : le coût d'allocation d'objets à courte durée de vie est très faible sur une JVM moderne.

## À retenir

- Le seul vrai coût de l'immutabilité : un objet par valeur, aggravé par les opérations à plusieurs étapes.
- Parade 1 : offrir ces opérations comme primitives qui travaillent en privé et ne créent qu'un objet.
- Parade 2 : un compagnon mutable (`StringBuilder`), seulement si la mesure l'exige, et dont `build()` copie.
- Si la classe doit être mutable : `private final` par défaut, objets complètement initialisés, pas de réinitialisation.

> **Source :** *Effective Java*, 3e éd., item 17 (pages 83 à 86). Concaténation : JEP 280 ; chaînes compactes : JEP 254.
