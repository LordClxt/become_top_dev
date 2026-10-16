## Contexte

Un client HTTP manipule des statuts à longueur de journée. Créer un objet neuf pour chaque réponse `200` ne sert à rien : les statuts sont immuables, autant les **partager**. Tu transformes `HttpStatus` en classe **à instances contrôlées**, que l'on n'obtient que par des fabriques statiques.

Tu édites `HttpStatus.java` et `StatusCodes.java`.

## 1. `HttpStatus.of(int code)`

- Renvoie **toujours la même instance** pour un même code : `of(404) == of(404)`, y compris pour un code non répertorié comme `299` (raison `"Unknown"`).
- Code hors de `[100, 599]` : `IllegalArgumentException`, avec la valeur fautive dans le message.
- Les constantes `OK` et `NOT_FOUND` doivent être les instances renvoyées par `of`.

## 2. `HttpStatus.from(String statusLine)`

Conversion depuis une ligne de statut : seul le premier mot compte.

```java
HttpStatus.from("404 Not Found") == HttpStatus.NOT_FOUND   // true
HttpStatus.from("  201  ").code()                         // 201
HttpStatus.from("OK 200")                                 // IllegalArgumentException
```

## 3. Fermer la porte

- Plus aucun constructeur de `HttpStatus` ne doit être accessible depuis l'extérieur.
- `StatusCodes` est une classe utilitaire : elle ne doit **jamais** être instanciée, même par réflexion.

## Contraintes

Pas de bibliothèque externe. Les tests vérifient aussi, par réflexion, la visibilité des constructeurs.
