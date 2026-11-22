## Contexte

Les opérateurs pilotent Ordo depuis une console : `buy 10 ACME`, `cancel o-1`, `status`. Chaque commande est une méthode marquée `@Command` dans une classe de commandes ; certaines ont des alias (`@Alias`, fourni, qu'on peut poser plusieurs fois) ; certaines sont réservées à des rôles. La première version de la console ne trouve aucune commande, ignore les rôles, et rend `erreur: null` quand une commande échoue.

Pas d'indices pour ce combat : tout ce qu'il faut est dans les cinq leçons du module.

## Les règles

**L'annotation `@Command`** (`Command.java`) : un nom (`value`) et des rôles (`roles`, vide par défaut). Elle se lit à l'exécution, et le compilateur refuse de la poser ailleurs que sur une méthode.

**La construction** `new Router(handlers…)` :
- n'accepte, **à la compilation**, que des `ConsoleHandler` (interface marqueur fournie) ;
- trouve les méthodes `@Command` de chaque gestionnaire, et leurs alias, qu'il y en ait un ou plusieurs ;
- refuse (`IllegalArgumentException`, dont le message contient le nom de la méthode) toute méthode `@Command` qui n'est pas `public String nom(List<String> args)` d'instance : non publique, statique, mauvais paramètres ou mauvais retour ;
- refuse un nom ou un alias déjà pris (`IllegalArgumentException`, dont le message contient ce nom).

**L'exécution** `run(role, line)` découpe la ligne sur les espaces (en ignorant ceux du début, de la fin, et les répétitions). Le premier mot est un nom ou un alias, les suivants sont les arguments. Elle rend, sans jamais lever :
- `inconnu: <mot>` si aucune commande ne correspond ;
- `refusé: <nom>` si le rôle n'est pas autorisé (toujours le nom, même appelé par un alias) ;
- `erreur: <message>` avec le message de l'exception levée **par la commande** ;
- sinon le résultat de la commande.

**Les rôles** : `roles` vide autorise tous les rôles ; `ADMIN` est toujours autorisé.
- `rolesFor(nomOuAlias)` : les rôles autorisés, dans l'ordre de déclaration, non modifiables ; `IllegalArgumentException` pour une commande inconnue.
- `commandsByRole()` : pour **chaque** rôle, dans l'ordre de déclaration, les noms (sans les alias) des commandes qu'il peut lancer, triés.

`Router.java` et `Command.java` compilent avec `-Xlint:all -Werror`. Fichiers modifiables : `Command.java` et `Router.java`.
