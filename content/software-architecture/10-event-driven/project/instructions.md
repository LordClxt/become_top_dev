## archkit, épisode 11

Le dernier outil de ce parcours rassemble tout le module : un broker en mémoire qui ne perd rien, et un médiateur qui sait reprendre.

### Jalon 1 : `Broker`
- `declareQueue(name)` ; `send(queue, body)` → id (`m1`, `m2`…).
- `subscribe(topic, subscriber)` crée l'abonnement **durable** `topic/subscriber` ; `publish(topic, body)` y dépose **une copie** (même id) pour chaque abonné ; sans abonné, le message disparaît ; un abonné tardif ne reçoit pas le passé.
- `receive(canal, consommateur)` lit le prochain message prêt et le **réserve** (acquittement client) ; plusieurs consommateurs sur une file se partagent les messages.
- `ack(consommateur, canal, id)` le retire définitivement (`NotInFlightError` s'il n'est pas réservé par ce consommateur).
- `crash(consommateur)` remet ses messages non acquittés **en tête** de leur canal, dans leur **ordre de lecture**, marqués `redelivered: true`, et renvoie leur nombre.
- `depth(canal)` : messages prêts. Un canal inconnu lève `UnknownChannelError`. Les corps sont **copiés**.

### Jalon 2
- `request(queue, body)` → id ; `reply(replyQueue, requête, body)` envoie une réponse dont `correlationId` = id de la requête ; `takeReply(replyQueue, correlationId)` retire **la** réponse correspondante (les autres restent).
- `idempotent(handler)` : `handle(msg)` appelle le gestionnaire seulement si l'id n'a jamais été traité **avec succès**, et renvoie `true` s'il l'a traité ; `processed()` compte les messages traités.

### Jalon 3 : `Mediator`
`new Mediator(étapes, tâches, store)` : chaque étape est une liste de tâches lancées **en parallèle** ; les étapes s'enchaînent **en série**.
- `start(id)` (`AlreadyStartedError` si un état existe) : exécute, persiste l'état après chaque étape (`done` liste les tâches acquittées sous la forme `"étape:tâche"`).
- Si une tâche échoue : statut `stopped`, `step` = étape en échec, `error` = `"tâche: message"` (plusieurs séparées par `; `), état persisté, et on n'avance pas.
- `resume(id)` (`NotStoppedError` si rien n'est arrêté) : reprend à l'étape en échec **sans** relancer les tâches déjà acquittées.
- Workflow terminé : statut `completed`, et l'état est **supprimé** du store.
