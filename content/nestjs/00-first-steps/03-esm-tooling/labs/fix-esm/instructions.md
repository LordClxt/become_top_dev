## Contexte

Un collègue a migré le petit service de catalogue vers ESM, puis a laissé son éditeur « corriger » les imports. Rien ne marche plus. La logique est juste : il ne faut corriger **que** les problèmes de modules.

Il y a **quatre** erreurs, réparties dans les quatre fichiers éditables. Lis les messages : ceux de tsc d'abord, puis ceux de l'exécution.

## Ce que les tests vérifient

- `GET /catalog` renvoie la liste des livres (le contrôleur reçoit bien le service) ;
- `CatalogService.dataDir()` renvoie le chemin absolu du dossier `data` placé à côté du fichier compilé du service ;
- `http(app)` (dans `client.ts`) renvoie un agent supertest utilisable ;
- les types sont corrects (`tsc --strict`).

## Contraintes

Ne change pas les signatures publiques. Pas de `any`, pas de `// @ts-ignore`.
