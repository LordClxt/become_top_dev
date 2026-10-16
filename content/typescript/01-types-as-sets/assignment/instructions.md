## Contexte

Une configuration d'application mélange valeurs par défaut, variables d'environnement et surcharges explicites. Tu l'écris avec **une seule source de vérité** (la constante `DEFAULTS`) dont tous les types sont déduits, et tu laisses les contrôles de TypeScript attraper les fautes de frappe dans les options.

Tu édites `config.ts`.

## À faire

1. Types : `Config` (le type de `DEFAULTS`), `ConfigKey` (ses clés), `ConfigOverrides` (toutes les clés optionnelles, c'est un type faible), `Env` (un dictionnaire en lecture seule dont les valeurs peuvent être `undefined`).
2. `envName(key)` : `APP_HOST`, `APP_PORT`, `APP_DEBUG`. Le paramètre accepte toutes les clés **sauf** `tags` (utilise `Exclude`).
3. `loadConfig(overrides, env)` : priorité surcharges > environnement > défauts. `APP_PORT` : entier de 1 à 65535, sinon `RangeError`. `APP_DEBUG` : vrai pour `'true'` ou `'1'` (casse libre). Le tableau `tags` du résultat est une **copie**.
4. `describe(config)` : `hôte:port`, plus ` (debug)` si actif, plus ` [a,b]` s'il y a des tags.

## Contraintes

Aucun `any`, aucune assertion `as`. Les types sont déduits (`typeof`, `keyof`, `Partial`), pas recopiés.
