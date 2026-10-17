## Contexte

Une API de sommets renvoie du JSON non typé. Tu écris des fonctions aux **signatures précises** qui contiennent les rares assertions nécessaires, chacune justifiée par un commentaire.

Tu édites `peaks.ts`.

## À faire

1. `fetchPeak(id)` → `Promise<MountainPeak>` : appelle `api.getJSON(...)` (qui renvoie `Promise<unknown>`), vérifie au minimum que la réponse est un objet avec un `name` chaîne (sinon `Error("réponse invalide")`), puis asserte.
2. `shallowObjectEqual(a, b)` (deux `object`) : mêmes clés propres, valeurs égales par `===`.
3. `cacheLast(fn)` : renvoie une fonction **du même type** que `fn` qui ne rappelle pas `fn` si les arguments sont superficiellement égaux (même longueur, éléments `===`) à ceux de l'appel précédent.

## Contraintes

Au plus une assertion par fonction, chacune avec un commentaire. Pas de paramètre `any`.
