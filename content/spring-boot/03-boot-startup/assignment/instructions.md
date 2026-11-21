## Contexte

À 3 h du matin, la personne de garde redéploie Tixa sur un nouveau serveur. L'application refuse de démarrer, et le journal montre quarante lignes de pile d'exceptions : `BeanCreationException`, `BeanInstantiationException`, et enfin, tout en bas, `MissingSecretException: secret manquant : tixa.payment.api-key`. Il lui faut dix minutes pour comprendre qu'une variable d'environnement manque.

Spring Boot sait faire beaucoup mieux : quand le démarrage échoue, il demande à ses **analyseurs d'échec** de transformer l'exception en un rapport `APPLICATION FAILED TO START` avec une *Description* et une *Action*. Tu en écris un.

`MissingSecretException` (qui connaît la propriété et la variable d'environnement attendue) et `PaymentGateway` (qui la lève) sont fournis. Tu écris `MissingSecretFailureAnalyzer.java` et `META-INF/spring.factories`.

## Ta tâche

1. `MissingSecretFailureAnalyzer` reconnaît une `MissingSecretException` **où qu'elle soit** dans la chaîne des causes (le conteneur l'enveloppe), et ne reconnaît rien d'autre.
2. Son analyse donne :
   - une **description** qui nomme la propriété manquante (`tixa.payment.api-key`) et ce que ça empêche ;
   - une **action** qui donne la variable d'environnement à définir (`TIXA_PAYMENT_APIKEY`) ;
   - comme cause, la `MissingSecretException`.
3. Spring Boot le trouve sans qu'aucun bean ne soit déclaré.

## Ce qui sera relu

La revue juge le rapport du point de vue de la personne de garde : est-il exécutable sans lire le code ? N'expose-t-il aucune valeur sensible ?
