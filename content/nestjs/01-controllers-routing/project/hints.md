## Hint 1
M1 : `enableVersioning({ type: VersioningType.URI })`, `@Controller({ path: 'books', version: '1' })`, `@Controller({ path: 'health', version: VERSION_NEUTRAL })`. Pour `Location`, `@Res({ passthrough: true })` ; `BooksService.create` renvoie `null` si l'ISBN existe.

## Hint 2
M2 : un second contrôleur, `@Controller({ path: 'books', version: '2' })`, qui reçoit le même `BooksService`. `@Query('page', new DefaultValuePipe(1), ParseIntPipe)`, puis les bornes vérifiées à la main.

## Hint 3
M3 : dans `NestFactory.create(module, { … })`, ajoute `routeResolutionStrategy: 'specificity'` et `routeConflictPolicy: { duplicate: 'error', shadow: 'error' }`. `createApp` prend le module en paramètre (par défaut `AppModule`) : les tests lui passent un module volontairement cassé.
