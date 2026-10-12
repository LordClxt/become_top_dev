## Hint 1
Un `RouteBuilder` de premier niveau avec `methodMissing(String verb, Object args)` : Attention : pour `get '/users', to: 'user#index'`, Groovy regroupe les arguments nommés dans une Map passée **en premier** ; le chemin vient après (`args[0]` = la Map, `args[1]` = le chemin). Cherche chacun par son type plutôt que par sa position. Vérifie le verbe dans `['get','post','put','delete']`, sinon relance `new MissingMethodException(verb, RouteBuilder, args)`.

## Hint 2
`group(String prefix, Closure body)` : crée un nouveau `RouteBuilder` partageant la même liste de routes mais avec le préfixe `ancienPréfixe + prefix`, fixe-le comme delegate de `body` (DELEGATE_FIRST) et exécute `body`. Un helper `run(closure, builder)` évite de répéter ces trois lignes.

## Hint 3
Stocke pour chaque route ses **segments** (`'/users/:id'.split('/').findAll { it }`). `match` compare le nombre de segments, puis chaque segment : s'il commence par `:` il capture, sinon il doit être égal. Pour `path`, reconstruis la chaîne en remplaçant chaque segment `:nom` par `params[nom]`.
