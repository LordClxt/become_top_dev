## Hint 1
`@Profile("prod")` sur un composant : il n'est enregistré que si le profil `prod` est actif. Une expression de profil accepte la négation : `@Profile("!prod")`.

## Hint 2
Un groupe se déclare dans la configuration : `spring.profiles.group.staging: prod, us`. Les profils du groupe sont actifs comme s'ils avaient été demandés.

## Hint 3
Un document YAML séparé par `---`, avec `spring.config.activate.on-profile: us`, n'est lu que si `us` est actif. Il ne contient que ce qui change (`tixa.bank.region: us`).
