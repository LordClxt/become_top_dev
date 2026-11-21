## Contexte

Avec `@Value("${tixa.hold.timeout}")`, une faute de frappe dans la clé, une durée écrite « 15 » au lieu de « 15m » ou un nombre de places à 50 ne se voient qu'en production. Tixa passe à une configuration **typée** : un `record` qui représente tout le préfixe `tixa`, lié et vérifié au démarrage.

`HoldService` (qui l'utilise) est fourni. Tu complètes `TixaProperties.java` et `TixaApp.java`.

## Ta tâche

1. `TixaProperties` est lié au préfixe `tixa` et devient un bean, trouvé automatiquement dans le paquet de l'application.
2. Valeurs par défaut, quand rien n'est configuré :

| propriété | défaut |
|---|---|
| `tixa.currency` | `EUR` |
| `tixa.notifiers` | liste vide (jamais `null`) |
| `tixa.hold.timeout` | `15m` |
| `tixa.hold.max-seats` | `6` |

   `hold` n'est jamais `null`.
3. Validation au démarrage, sinon l'application **refuse de démarrer** :
   - `currency` : trois lettres majuscules ;
   - `hold.max-seats` : entre 1 et 10 ;
   - `hold.timeout` : présent.

Une durée s'écrit `90s`, `15m`, `PT2H`… ; `tixa.hold.max-seats` et `tixa.hold.maxSeats` désignent la même propriété.
