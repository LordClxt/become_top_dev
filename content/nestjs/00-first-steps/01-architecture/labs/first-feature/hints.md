## Hint 1
Trois décorateurs servent ici : un pour le service, un pour la classe contrôleur (avec son préfixe) et un pour chaque méthode HTTP. Le module, lui, se décrit avec `@Module({...})`.

## Hint 2
Le contrôleur déclare `constructor(private readonly quotes: QuotesService) {}`. Le type du paramètre suffit : Nest lit ce type pour savoir quoi injecter.

## Hint 3
`@Module({ controllers: [QuotesController], providers: [QuotesService], exports: [QuotesService] })`. Sans `exports`, `StatsModule` ne trouve pas le service et le démarrage échoue avec « Nest can't resolve dependencies ».
