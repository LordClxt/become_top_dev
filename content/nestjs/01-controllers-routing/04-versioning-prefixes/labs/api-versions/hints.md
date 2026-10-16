## Hint 1
Trois réglages dans `createApp()` : le préfixe global avec son exclusion, puis le versioning par URI avec une version par défaut. Ensuite, chaque contrôleur déclare sa version : `@Controller({ path: 'books', version: '2' })`.

## Hint 2
Avec `defaultVersion: '1'`, la sonde devient `/v1/health`. Elle ne doit dépendre d'aucune version : il existe une constante prévue pour ça dans `@nestjs/common`.

## Hint 3
Pour la route `count`, écris-la une fois dans le contrôleur v1 avec `@Version(['1', '2'])`. Le contrôleur santé : `@Controller({ path: 'health', version: VERSION_NEUTRAL })`. Le préfixe : `setGlobalPrefix('api', { exclude: ['health'] })`.
