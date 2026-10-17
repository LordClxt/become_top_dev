## Contexte

Le contrôleur et le service sont écrits, mais `AppModule` est vide : Nest ne sait pas qu'ils existent, et `GET /hello` répond 404.

## À faire

Déclare `HelloController` et `HelloService` dans `AppModule`.
