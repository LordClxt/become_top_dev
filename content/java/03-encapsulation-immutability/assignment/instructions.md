## Contexte

`AppConfig` est lue au démarrage puis passée à tous les modules : serveur HTTP, client de base de données, contrôle d'accès, et une douzaine de threads. Aujourd'hui, c'est un sac de champs : un module de test « ajuste » le port, un autre ajoute un hôte « temporairement », et la configuration de production n'est plus celle qu'on croit. Pire : un `log.info(config)` a imprimé le mot de passe de la base dans les logs.

## Ta mission

Rends `AppConfig` **profondément immuable**, sans changer son API publique.

**Construction** (`AppConfig.builder(name)`, puis `build()`) :
- `name` non vide ;
- `port` entre 1 et 65 535, 8080 par défaut ;
- `timeout` strictement positif et au plus 5 minutes, 30 secondes par défaut ;
- au moins un hôte (`addHost`), sans doublon (un doublon est ignoré, l'ordre d'ajout est conservé) ;
- `env(key, value)` et `grant(role, permission)` (un rôle accumule ses permissions) ;
- une règle violée : `IllegalArgumentException` au `build()` (ou `NullPointerException` pour un `null`).

**Immutabilité** :
- rien de ce qu'on fait ensuite avec le builder, ni avec ce que renvoient les accesseurs (`hosts()`, `env()`, `roles()`, **et les ensembles de permissions de `roles()`**), ne peut modifier une configuration construite ;
- `withPort(int)` et `withTimeout(Duration)` renvoient une nouvelle configuration, avec **les mêmes règles de validation**, et **partagent** les collections existantes au lieu de les recopier (`c.withPort(9090).hosts() == c.hosts()`) ;
- `toBuilder()` repart d'une configuration existante pour en créer une autre.

**Contrats** : `equals` et `hashCode` sur tout le contenu. `toString` affiche tout, sauf la valeur des variables d'environnement dont le nom contient `SECRET`, `PASSWORD` ou `TOKEN` (insensible à la casse), remplacée par `***`.
