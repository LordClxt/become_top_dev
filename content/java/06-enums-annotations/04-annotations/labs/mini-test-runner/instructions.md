## Contexte

Pour remplacer l'ancienne convention « toutes les méthodes qui commencent par `check` », Ordo a écrit deux annotations, `@Check` et `@ExpectThrows`, et un petit lanceur, `MiniRunner`. Premier essai sur la classe de démonstration : **zéro** vérification lancée, puis plantage sur une méthode d'instance. Et les vérifications `@ExpectThrows` échouent toutes, même quand la bonne exception est levée.

Les règles du lanceur :
- `@Check` : méthode `static` sans paramètre, réussie si elle ne lève rien ; sinon `nom : TypeSimple message`.
- `@ExpectThrows(types)` : réussie si la méthode lève une exception de l'**un** des types ; sinon `nom : aucune exception` ou `nom : TypeSimple inattendue`.
- Une méthode annotée qui n'est pas `static` ou qui a des paramètres : `nom : invalide` (compte comme un échec, sans faire planter le lanceur).
- Les méthodes sans annotation sont ignorées ; les méthodes sont traitées dans l'ordre alphabétique de leur nom.

## Ta mission

Trouve et corrige les défauts. Fichiers modifiables : `Check.java` et `MiniRunner.java`.
