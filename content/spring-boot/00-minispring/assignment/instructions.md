## Contexte

Minispring sait injecter un bean par type, à condition qu'il n'y ait qu'un candidat. Le vrai Spring va plus loin, et le module 01 s'en servira tout le temps : un candidat par défaut (`@Primary`), tous les candidats d'un coup (`List<T>`), et un accès différé (`ObjectProvider<T>`, ici `Provider<T>`).

`MiniContainer` est fourni. Pour chaque paramètre de constructeur, il appelle `Resolution.argument(type, beans, requester)` avec le type **générique** du paramètre (`getGenericParameterTypes`). Tu écris `Resolution.java`.

## Ta tâche

**Un type simple** (`Gateway`) :
- un seul candidat : celui-là ;
- plusieurs : l'unique candidat `@Primary` ;
- erreurs, dans ce format exact :
  - `aucun bean de type Gateway (demandé par checkout)`
  - `2 beans de type Gateway (demandé par checkout) : stripe, lydia`
  - `plusieurs beans @Primary de type Gateway (demandé par checkout) : paypal, adyen`

**`List<T>`** : tous les candidats de `T`, dans l'ordre d'enregistrement (`@Primary` ne change rien). Aucun candidat : liste vide.

**`Provider<T>`** : un objet dont chaque `get()` refait la résolution de `T` (même règles que le type simple) et redemande le bean. Rien n'est cherché ni créé avant le premier `get()`, et une erreur n'apparaît qu'à ce moment-là.

## Ce qui sera relu

Au-delà des tests, la revue juge si le départage n'est écrit qu'**une fois**, si `Provider` est vraiment différé, et si les types génériques sont lus proprement.
