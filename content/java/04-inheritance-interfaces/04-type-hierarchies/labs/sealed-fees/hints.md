## Hint 1
Pourquoi les paliers coûtent-ils 0 ? Regarde le `switch` et sa branche `default`. Une classe à étiquette imite mal une hiérarchie de classes : une sorte = une classe, avec ses seuls champs.

## Hint 2
`public sealed interface Fee { long on(long notionalCents); … }` avec trois records imbriqués dans le même fichier (`permits` est alors inutile), chacun `implements Fee`. Les fabriques statiques de l'interface renvoient `new Flat(cents)`, etc.

## Hint 3
Valide dans le constructeur compact de chaque record (`public Percent { … }`). Une méthode `private static` de l'interface peut partager la vérification des points de base. Les records fournissent `equals` et `hashCode`.
