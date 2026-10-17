## Contexte

Une bibliothèque de configuration permet de lire une valeur par un chemin en notation pointée (`get(config, 'db.pool.max')`) et de déclarer des handlers nommés d'après les événements (`onSave`, `onLoad`). Tu écris les types qui rendent ces deux API sûres : un chemin inexistant ou un handler mal nommé doivent être refusés.

Tu édites `paths.ts`.

## À faire

1. `Paths<T>` : l'union des chemins pointés d'un objet, y compris les chemins intermédiaires (`'db' | 'db.host' | 'db.pool' | 'db.pool.max'`). Les tableaux et les `Date` sont des feuilles.
2. `PathValue<T, P>` : le type de la valeur au bout du chemin.
3. `getPath(obj, path)` : la valeur à l'exécution, typée `PathValue<T, P>`.
4. `Handlers<E>` : pour chaque événement `K` de `E`, une propriété **optionnelle** `` `on${Capitalize<K>}` `` de type `(payload: E[K]) => void`.
5. `dispatch(handlers, event, payload)` : appelle le handler correspondant s'il existe ; renvoie `true` s'il a été appelé.

## Contraintes

Pas de `any`. Au plus une assertion par fonction, justifiée.
