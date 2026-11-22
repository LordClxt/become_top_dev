## Hint 1
Pourquoi des champs vides plutôt qu'une erreur ? Un paramètre d'un type à toi, sans annotation que Spring connaisse, finit chez un « attrape-tout » : `@ModelAttribute`, qui fabrique un `Customer` à partir des paramètres de requête… absents. Ton résolveur, lui, n'est jamais consulté.

## Hint 2
Un résolveur maison n'est consulté que s'il est **enregistré** : `addArgumentResolvers` dans un `WebMvcConfigurer`. Et `resolveArgument` peut lever une exception ; une `ResponseStatusException` choisit le statut.

## Hint 3
`directory.find(request.getHeader("X-Customer-Id")).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "client non identifié"))`, et dans `WebConfig`, injecte `CustomerDirectory` pour faire `resolvers.add(new CurrentCustomerResolver(directory))`. Garde `supportsParameter` étroit : l'annotation **et** le type `Customer`.
