## Hint 1
`@ConfigurationProperties("tixa")` sur le record, et `@ConfigurationPropertiesScan` sur la classe d'application. Un record est lié par son constructeur : chaque composant reçoit la valeur de la propriété du même nom (en kebab-case dans les fichiers).

## Hint 2
`@DefaultValue("15m")` (de `org.springframework.boot.context.properties.bind`) sur un composant donne sa valeur par défaut, convertie comme une vraie propriété. `@DefaultValue` sans valeur sur une liste ou un record imbriqué donne une liste vide ou un objet construit avec ses propres défauts.

## Hint 3
`@Validated` sur le record active la validation ; les contraintes Jakarta (`@Pattern`, `@Min`, `@Max`, `@NotNull`) se posent sur les composants. Pour que Hold soit validé lui aussi, le composant `hold` doit porter `@Valid`.
