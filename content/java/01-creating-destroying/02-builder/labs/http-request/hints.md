## Hint 1
Le builder est une classe imbriquée **statique** qui porte les mêmes informations que la requête, mais modifiables. `HttpRequest` reçoit le builder dans un constructeur **privé** et recopie ses valeurs dans des champs `final`. Chaque méthode du builder renvoie `this` pour pouvoir chaîner.

## Hint 2
Valide chaque paramètre là où il arrive : URL dans le constructeur du builder, nom d'en-tête dans `header`, durée dans `timeout`. Ce qui concerne plusieurs paramètres (méthode + corps) se vérifie à la construction de la requête, sur les valeurs déjà copiées.

## Hint 3
Pour les en-têtes, une `LinkedHashMap<String, List<String>>` dans le builder avec `computeIfAbsent(name, n -> new ArrayList<>()).add(value)`. Dans le constructeur de `HttpRequest`, copie chaque liste avec `List.copyOf` et la map avec `Map.copyOf` : les copies sont non modifiables ET indépendantes du builder.
