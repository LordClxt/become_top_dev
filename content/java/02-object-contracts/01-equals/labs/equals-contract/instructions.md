## Contexte

Quatre classes d'une bibliothèque de géolocalisation passent leurs tests unitaires… et se comportent bizarrement dès qu'on les met dans une collection. Chacune viole le contrat d'`equals` d'une façon différente. `Color` est fourni.

## 1. `CaseInsensitiveString`

Elle se dit égale aux `String` de même texte (à la casse près). Rends l'égalité **symétrique** : une `CaseInsensitiveString` n'est égale qu'à une autre `CaseInsensitiveString`, sans tenir compte de la casse.

## 2. `Point`

Son `equals` utilise `getClass()`. Une sous-classe qui n'ajoute **aucune valeur** (les tests en définissent une, qui compte ses instances) doit rester égale au `Point` de mêmes coordonnées. Garde `Point` non `final`.

## 3. `ColorPoint`

Il étend `Point` et ajoute une couleur : selon l'ordre des appels, l'égalité n'est ni symétrique ni transitive. Réécris-le **par composition** :

- `ColorPoint` n'hérite plus de `Point` ; il contient un `Point` et une couleur ;
- `asPoint()` renvoie la position, vue comme un `Point` ;
- deux `ColorPoint` sont égaux si position **et** couleur sont égales ; un `ColorPoint` n'est jamais égal à un `Point`.

Le constructeur `ColorPoint(int x, int y, Color color)` et `color()` restent ; `color` ne peut pas être `null`.

## 4. `Measurement`

Une mesure de capteur : un identifiant de capteur (**peut être `null`** pour une mesure manuelle) et une valeur `double` (**peut être `NaN`** quand le capteur est en panne). En plus des pièges sur ces deux champs, son `equals` n'est pas vu par `HashSet`. Trouve pourquoi et corrige.

Chaque classe garde un `hashCode` cohérent : il est fourni, ne le casse pas (sauf si ta correction l'exige).
