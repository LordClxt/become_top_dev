## Hint 1
`typeof DEFAULTS` donne `Config` ; `keyof Config` donne `ConfigKey` ; `Partial<Config>` donne les surcharges ; `Readonly<Record<string, string | undefined>>` donne `Env`.

## Hint 2
Pour chaque champ, empile les sources : `overrides.port ?? (texteEnv !== undefined ? parsePort(texteEnv) : DEFAULTS.port)`. Écris `parsePort` à part : `Number.isInteger` suffit à rejeter `NaN` et `80.5`, et `Number('')` vaut `0`, que la plage refuse.

## Hint 3
Copie le tableau avec `[...(overrides.tags ?? DEFAULTS.tags)]`. Pour `envName`, `` `APP_${key.toUpperCase()}` `` : `key` est déjà un `'host' | 'port' | 'debug'`.
