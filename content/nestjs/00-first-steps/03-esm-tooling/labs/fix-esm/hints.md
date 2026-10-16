## Hint 1
Commence par les erreurs de tsc : l'une dit qu'un module relatif est introuvable (« Cannot find module »), l'autre qu'une expression n'est pas appelable. Corrige-les avant de lire les erreurs d'exécution.

## Hint 2
Il reste deux erreurs que tsc ne voit pas. Une variable globale de CommonJS n'existe pas en ESM. Et un import ne laisse qu'un type après compilation, alors que Nest a besoin de la classe comme jeton d'injection.

## Hint 3
`./catalog.service` → `./catalog.service.js` ; `import * as request` → `import request` ; `__dirname` → `import.meta.dirname` ; `import type { CatalogService }` → `import { CatalogService }`.
