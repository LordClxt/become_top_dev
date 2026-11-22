## Hint 1
Le rapport des conditions dit, pour chaque autoconfiguration et chaque bean, pourquoi il a été retenu ou écarté. Dans un test : `ConditionEvaluationReport.get(ctx.getBeanFactory()).getConditionAndOutcomesBySource()`, ou lance une application avec `--debug`.

## Hint 2
Deux faits de Spring Boot : sans ordre déclaré, les autoconfigurations sont évaluées par **ordre alphabétique** de leur nom de classe, et `@ConditionalOnBean` ne voit que ce qui est déjà enregistré. Et Spring Boot 4 utilise **Jackson 3**, dont les classes sont dans le paquet `tools.jackson`, plus `com.fasterxml.jackson`.

## Hint 3
`@AutoConfiguration(after = TixaClientAutoConfiguration.class)` sur les métriques. Pour Jackson, `@ConditionalOnClass(JsonMapper.class)` avec une vraie référence de classe : c'est sûr ici, car l'annotation est lue par Spring sans charger la classe, et une faute de nom ne compile plus.
