## Contexte

Une requête HTTP a deux paramètres obligatoires (méthode, URL) et une poignée d'options (en-têtes, timeout, corps). Avec des constructeurs télescopiques, `new HttpRequest(POST, url, null, 0, "")` devient vite illisible ; avec des setters, l'objet existe à moitié construit et ne peut pas être immuable. Tu écris un **builder**.

Tu édites `HttpRequest.java`. Les signatures sont déjà là : à toi d'écrire les champs et les corps.

## Ce qui est attendu

```java
HttpRequest r = new HttpRequest.Builder(Method.POST, "https://api.example.com/orders")
        .header("Content-Type", "application/json")
        .timeout(Duration.ofSeconds(5))
        .body("{\"qty\": 3}")
        .build();
```

- **Obligatoires** dans le constructeur du builder : `null` donne `NullPointerException`, une URL qui ne commence pas par `http://` ou `https://` donne `IllegalArgumentException` **immédiatement** (avec l'URL dans le message).
- **Optionnels** avec valeurs par défaut : aucun en-tête, timeout de 30 s, corps vide.
- `header` peut être appelé plusieurs fois avec le même nom : les valeurs s'accumulent dans l'ordre. Nom vide ou blanc : `IllegalArgumentException`.
- `timeout` refuse une durée nulle ou négative.
- `build()` vérifie l'invariant qui porte sur **deux** paramètres : `GET` et `DELETE` n'ont pas de corps.

## La requête est immuable

- Tous ses champs sont `final`.
- `headers()` ne peut pas être modifiée, ni la map, ni les listes de valeurs.
- On peut continuer à utiliser un builder après `build()` : les requêtes déjà construites ne doivent pas changer.
