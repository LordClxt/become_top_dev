## Contexte

Le service de notifications envoie des e-mails et des SMS. Le code actuel construit les messages avec des constructeurs à huit paramètres, lit l'heure avec `Instant.now()` partout (tests impossibles) et, quand un envoi échoue au milieu d'un lot, **les messages suivants sont perdus et l'erreur d'origine aussi**. Tu réécris le cœur.

Pas d'indices pour ce combat : tout ce qu'il faut est dans les cinq leçons du module.

## 1. Les messages : un builder hiérarchique

`Message` est **abstraite** ; `Email` et `Sms` l'étendent. Chacune a son builder, et les méthodes communes se chaînent avec les méthodes spécifiques **sans cast**, dans n'importe quel ordre :

```java
Email mail = new Email.Builder("ana@example.com")
        .tag(Tag.BILLING)            // méthode de Message.Builder
        .subject("Votre facture")    // méthode d'Email.Builder
        .tag(Tag.URGENT)
        .body("Montant : 42 €")
        .build();                    // renvoie un Email, pas un Message

Sms sms = new Sms.Builder("+33612345678").body("Code : 1234").build();
```

Commun à tous les messages (`Message.Builder`) :
- `body(String)` obligatoire au `build()` : non nul et non blanc, sinon `IllegalStateException`.
- `tag(Tag)` peut s'appeler plusieurs fois ; `tags()` renvoie un ensemble **non modifiable** (pense à la structure faite pour les enums).
- `recipient()` renvoie le destinataire passé au constructeur du builder.

`Email.Builder(String to)` : `to` doit contenir un `@` qui n'est ni au début ni à la fin (`IllegalArgumentException` immédiate). `subject` par défaut : `"(sans objet)"`.

`Sms.Builder(String phone)` : numéro au format E.164, `+` suivi de 8 à 15 chiffres (`IllegalArgumentException` immédiate). Au `build()`, un corps de plus de 160 caractères donne `IllegalStateException` : c'est un invariant de `Sms`, pas de `Message`.

Les messages sont **immuables** ; un builder peut resservir.

## 2. L'`Outbox`

```java
try (Outbox outbox = Outbox.open(transport, clock, ids)) {
    String id = outbox.queue(mail);   // "msg-1"
    outbox.queue(sms);
}                                     // tout est envoyé à la fermeture
```

- `Outbox.open(Transport, Clock, Supplier<String> ids)` : **pas de constructeur public**. Aucun argument nul.
- `queue(Message)` met le message en file et renvoie l'identifiant obtenu de `ids`. `pending()` donne le nombre en attente.
- `flush()` envoie chaque message en attente avec `transport.send(id, message, clock.instant())`. Si un envoi échoue, **les suivants partent quand même** ; à la fin, la **première** exception remonte et les autres lui sont attachées comme exceptions supprimées. Après `flush()`, la file est vide, échecs compris (les messages ratés sont rendus à l'appelant via l'exception, pas gardés en mémoire).
- `close()` fait un `flush()` puis ferme le transport (`Transport` est `AutoCloseable`). Si les deux échouent, l'erreur d'envoi reste l'exception principale et celle du transport lui est attachée. Le transport est fermé **même si** l'envoi a échoué.
- `close()` est idempotent. Après fermeture, `queue` lève `IllegalStateException`.

`Tag`, `Transport` et `SendException` sont fournis.
