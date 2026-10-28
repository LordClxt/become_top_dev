## Contexte

L'API du catalogue s'ouvre aux libraires. Chacun a une clé d'API (`x-api-key`), associée à un utilisateur et à ses rôles (`users.ts`). Le contrôleur est écrit (`app.ts`) et utilise des décorateurs qui n'existent pas encore. Écris-les dans `auth.ts`.

## Ce qui est attendu

- `ApiKeyGuard` (global) : sans clé connue → **401** ; sinon, pose l'utilisateur sur `request.user`. Les routes marquées `@Public()` (méthode ou classe) passent sans clé.
- `@Roles([...])` : les rôles exigés. Posé sur la classe, il vaut pour toutes ses routes ; posé sur une méthode, il **remplace** celui de la classe.
- `RolesGuard` (global, exécuté après `ApiKeyGuard`) : l'utilisateur doit avoir **au moins un** des rôles exigés, sinon **403**. Une route sans rôle exigé est ouverte à tout utilisateur authentifié.
- `@CurrentUser()` : l'utilisateur courant ; `@CurrentUser('name')` : un seul de ses champs.
- `@Auth(...roles)` : un raccourci composé, équivalent à `@Roles(roles)`.
