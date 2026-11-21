## Contexte

Écrire des advisors à la main, comme à la leçon précédente, devient vite lourd. Spring accepte une syntaxe plus déclarative, empruntée à AspectJ : une classe `@Aspect` dont les méthodes disent **quand** agir (une expression de *pointcut*) et **quoi** faire (un conseil, ou *advice*). Le conteneur s'occupe de poser les proxies.

Tu écris `TimedAspect.java` et tu complètes `AppConfig.java`. `@Timed`, `Metrics`, `Ticker` et `ReservationService` sont fournis. Les tests déclarent eux-mêmes un bean `Ticker`.

## Ta tâche

1. `TimedAspect` est un `@Aspect` qui reçoit `Metrics` et `Ticker` par son constructeur. Un conseil `@Around` s'applique à toute méthode annotée `@Timed` et enregistre `métrique résultat durée` :
   - `reservation.reserve ok 25` quand l'appel réussit ;
   - `reservation.reserve erreur 25` quand il lève une exception, qui remonte telle quelle.
   La métrique est la valeur de l'annotation `@Timed` de la méthode.
2. Dans `AppConfig`, active l'auto-proxy AspectJ et déclare l'aspect comme bean.

Les méthodes sans `@Timed` ne sont pas mesurées.
