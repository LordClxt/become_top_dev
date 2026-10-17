## Hint 1
`export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = new ConfigurableModuleBuilder<IdGeneratorModuleOptions>().build();`, puis `class IdGeneratorModule extends ConfigurableModuleClass`. Tu obtiens `register` **et** `registerAsync`.

## Hint 2
Les métadonnées de `@Module({ providers: [IdGenerator], exports: [IdGenerator] })` s'ajoutent à celles que génère `register()`. Dans `IdGenerator`, injecte les options avec `@Inject(MODULE_OPTIONS_TOKEN)`.

## Hint 3
`.setExtras({ isGlobal: false }, (definition, extras) => ({ ...definition, global: extras.isGlobal }))` avant `.build()`. Pour refuser un préfixe invalide, lève une erreur dans le constructeur d'`IdGenerator` : le démarrage échoue.
