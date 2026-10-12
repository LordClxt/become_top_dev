## Contexte

Minigrails aura besoin de chaînes de traitement (filtres, intercepteurs) construites à partir de petites closures. Tu écris l'atelier qui les fabrique, dans `Fn.groovy`.

## À écrire

1. **`compose(Closure... fs)`** : `compose(f, g, h)` renvoie `x -> h(g(f(x)))`. Sans closure, elle renvoie l'identité.
2. **`partial(Closure c, Object... fixed)`** : renvoie `c` avec ses premiers paramètres fixés.
3. **`withLast(Closure c, Object last)`** : renvoie `c` avec son **dernier** paramètre fixé.
4. **`cached(Closure f)`** : renvoie une version qui ne recalcule jamais deux fois le même argument. Un test compte les appels de la closure d'origine.
5. **`sumTo(long n)`** : calcule `1 + 2 + … + n` pour `n` jusqu'à 200 000 **avec une closure récursive**. Un appel récursif classique déborderait la pile.

Les closures d'origine ne doivent pas être modifiées.
