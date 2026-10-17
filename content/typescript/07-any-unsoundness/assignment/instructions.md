## Contexte

Une application lit sa configuration dans un fichier JSON, puis l'écrase avec des variables d'environnement. L'ancien chargeur faisait `JSON.parse(text) as any` et lisait `config.port` en espérant le meilleur. Tu écris un chargeur où tout ce qui vient de l'extérieur est `unknown` jusqu'à preuve du contraire.

Tu édites `config.ts`.

## À faire

1. `isRecord(value)` : type guard d'objet simple (ni `null`, ni tableau).
2. `readConfig(raw)` (un `unknown`) → `AppConfig` :
   - `raw` doit être un objet, sinon `Error("configuration : un objet est attendu")` ;
   - `port` : entier entre 1 et 65535 (obligatoire) ; `host` : chaîne non vide, `"localhost"` par défaut ; `debug` : booléen, `false` par défaut ; `features` : tableau de chaînes, `[]` par défaut ;
   - toutes les erreurs sont collectées puis levées ensemble : `Error("configuration : port invalide ; features invalide")` (dans l'ordre port, host, debug, features).
3. `applyEnv(config, env)` : `env` est un `Record<string, string | undefined>` (comme `process.env`). `APP_PORT` (entier valide, sinon ignoré), `APP_HOST`, `APP_DEBUG` (`"1"`/`"true"` → `true`, `"0"`/`"false"` → `false`, autre → ignoré), `APP_FEATURES` (liste séparée par des virgules, espaces retirés, éléments vides ignorés). Renvoie un nouvel objet.
4. `loadConfig(text, env)` : `JSON.parse` (JSON invalide → `Error("configuration : JSON invalide")`), `readConfig`, puis `applyEnv`.

## Contraintes

Aucun `any`, aucune assertion `as`.
