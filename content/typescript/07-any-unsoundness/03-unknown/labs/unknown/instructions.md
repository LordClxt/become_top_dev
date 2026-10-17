## Contexte

Une bibliothèque lit des fiches de livres en JSON. L'ancien code renvoyait `any` (et un `load<T>()` qui n'était qu'une assertion déguisée). Tu passes à `unknown` et tu valides avec des **type guards**.

Tu édites `books.ts`.

## À faire

1. `parseJSON(text)` → `unknown` (et non `any`). JSON invalide : `Error("JSON invalide")`.
2. `isBook(value)` : un objet avec `title` (chaîne non vide), `author` (chaîne) et `year` (entier) ; `tags` est optionnel mais, s'il est présent, c'est un tableau de chaînes.
3. `readBooks(text)` : le JSON doit être un tableau, sinon `Error("un tableau est attendu")` ; renvoie `{ books, rejected }` : les livres valides et le nombre d'éléments rejetés.
4. `describe(value)` (prend un `unknown`) : `"livre : Dune (1965)"`, `"liste de 3 élément(s)"`, `"texte : abc"`, `"nombre : 4"`, `"rien"` (`null`/`undefined`), sinon `"autre"`.

5. Supprime `load<T>` : un paramètre de type qui n'apparaît que dans le retour est une assertion déguisée.

## Contraintes

Aucun `any`, aucune assertion `as`.
