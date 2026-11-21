## Contexte

Helpdesk publie des événements (`TicketOpened`, `TicketClosed`, `TicketAssigned`…) et plusieurs modules réagissent : courriels, statistiques, audit. Tu écris le bus qui les relie, sur le modèle des événements de Grails (`notify` / `@Subscriber`). Les classes d'événements sont dans les tests : elles héritent toutes de `TicketEvent`.

Fichiers : `Listener.groovy` et `EventBus.groovy`.

## 1. `Listener`

Un trait avec **une seule méthode abstraite**, `void onEvent(Object event)`. Il doit être possible de passer une closure partout où un `Listener` est attendu, sans `as`.

## 2. `subscribe(Map opts = [:], Class type, Listener listener)`

Abonne `listener` aux événements de `type`, **sous-classes comprises** (un abonné à `TicketEvent` reçoit aussi les `TicketClosed`). Renvoie un objet abonnement (de ton choix) utilisable par `unsubscribe`.

| Option | Défaut | Règle |
|---|---|---|
| `priority` | 0 | entier ; les priorités hautes passent d'abord ; à priorité égale, l'ordre d'abonnement |
| `once` | `false` | si vrai, l'abonné est retiré après sa première livraison |

Les options peuvent arriver en texte (`priority: '5'`, `once: 'true'`, venues d'un fichier de configuration). Une **clé inconnue** lève `IllegalArgumentException` en citant la clé.

## 3. `publish(Object event)` → `int`

Livre l'événement à chaque abonné concerné, dans l'ordre des priorités, et renvoie le nombre de livraisons. Si un abonné lève une exception, **les suivants sont quand même servis** ; l'erreur est ajoutée à `bus.errors` (une liste de Maps `[event: …, error: …]`).

## 4. `unsubscribe(subscription)`

Retire l'abonnement.

## 5. `subscribeAll(Map opts = [:], Object handler)`

Abonne un objet qui déclare des méthodes `on(...)` à un paramètre, par exemple `on(TicketEvent e)` et `on(TicketClosed e)`. Pour chaque événement publié, le handler est appelé **une seule fois**, par la méthode **la plus spécifique** pour la classe réelle de l'événement. Un événement qu'aucune méthode `on` n'accepte ne lui est pas livré.

```groovy
class Stats {
    List seen = []
    void on(TicketEvent e)  { seen << 'générique' }
    void on(TicketClosed e) { seen << 'fermé' }
}
bus.subscribeAll(new Stats())
bus.publish(new TicketClosed())   // seen == ['fermé'], une seule livraison
```
