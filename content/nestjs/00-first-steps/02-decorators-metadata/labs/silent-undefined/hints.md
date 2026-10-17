## Hint 1
Lis le message d'erreur du 500 : quelle variable vaut `undefined`, et dans quelle classe ? Puis compte combien d'instances de `BooksService` existent.

## Hint 2
Que fait tsc d'un constructeur dans une classe **sans aucun décorateur** ? Et un objet créé avec `new` dans un champ de classe passe-t-il par le conteneur ?

## Hint 3
Ajoute `@Injectable()` à `LatestService`, et injecte `BooksService` par le constructeur du contrôleur au lieu de l'instancier avec `new`.
