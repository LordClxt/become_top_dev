## Hint 1
Relis le trajet de la leçon : après l'appel de la méthode, qui décide de ce qu'on fait de la valeur de retour ? Avec `@Controller` seul, Spring cherche une **vue**.

## Hint 2
`@RestController` ajoute `@ResponseBody` à toutes les méthodes : la valeur de retour part vers un `HttpMessageConverter` (Jackson pour un objet).

## Hint 3
Pour choisir le statut, renvoie un `ResponseEntity<Event>`. `ResponseEntity.of(optional)` donne 200 avec le corps, ou 404 sans corps.
