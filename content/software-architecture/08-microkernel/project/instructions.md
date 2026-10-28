## archkit, épisode 9

Le microkernel repose sur des règles simples : un cœur qui ne connaît aucun cas particulier, des plug-ins indépendants qui ne touchent pas la base centrale, des contrats standard. Cet épisode les code… et les rend vérifiables.

### Jalon 1 : `Core`
- `register(key, plugin)` (une clé déjà prise lève `DuplicatePluginError`), `deregister(key)` (vrai si retiré), `keys()` (triées).
- `assess(key, device)` : localise le plug-in (`NoPluginError` sinon), lui passe les données, attend sa réponse, et la vérifie avec `contractProblems` : rapport non vide, `resell` booléen, `value` et `resellPrice` nombres finis ≥ 0, et `resellPrice === 0` si l'appareil n'est pas revendu. Une réponse non conforme lève `ContractViolationError` (avec la liste `problems`).

### Jalon 2
- `adapt(name, thirdParty, toStandard)` : un `AssessmentPlugin` standard à partir d'un plug-in tiers.
- `pluginNamespace(path)` : `{ domain, context }` si le chemin suit `app/plugin/<domaine>/<contexte>`, sinon `undefined`.
- `checkPluginIsolation(graph, centralDbPrefix)` : signale chaque import d'un plug-in vers **un autre** plug-in (`plugin-to-plugin`) ou vers la base centrale (`plugin-to-central-db`). Tri par `from` puis `to`.

### Jalon 3
- `remotePlugin(name, call, { timeoutMs, timer })` : si `call` ne répond pas avant `timer.after(timeoutMs)`, l'évaluation échoue avec `PluginTimeoutError`.
- `Core.assessAll(jobs)` : évalue tout en parallèle, dans l'ordre des jobs ; chaque résultat est `{ key, ok: true, output }` ou `{ key, ok: false, error }` (le **nom** de l'erreur). Une panne n'empêche pas les autres.
