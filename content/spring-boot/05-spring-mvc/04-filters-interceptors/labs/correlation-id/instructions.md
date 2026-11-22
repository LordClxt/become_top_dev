## Contexte

Le support de Tixa veut pouvoir retrouver, dans les journaux, toutes les lignes d'une requête signalée par un client. Le `TracingInterceptor` actuel pose `X-Request-Id` (et `X-Handler`, le nom de la méthode qui a traité la requête) sur la réponse, et range l'identifiant dans le MDC des journaux. En recette, l'en-tête manque sur les 404, sur les 500… et sur `/ping`, alors que les tests MockMvc de l'équipe passaient.

Il faut aussi protéger `/admin/**` : l'en-tête `X-Admin-Token: s3cret` est obligatoire, sinon **403**. `AdminGuard` existe, mais laisse tout passer et n'est pas branché.

Les tests démarrent **un vrai serveur** sur un port libre (`@SpringBootTest(webEnvironment = RANDOM_PORT)`) : ils voient exactement ce que reçoit un client.

## Ta mission

1. `X-Request-Id` sur **toutes** les réponses : 200, 404, 500. Un identifiant envoyé par le client est repris s'il est sûr (lettres, chiffres et tirets, 64 caractères au plus) ; sinon, un UUID est généré.
2. Le même identifiant dans le MDC (`requestId`) pendant la requête, et retiré après.
3. `X-Handler` (`ApiController#ping`) sur les réponses des contrôleurs, y compris en texte.
4. `/admin/**` : 403 sans le bon jeton.

Fichiers modifiables : `CorrelationIdFilter.java`, `TracingInterceptor.java`, `AdminGuard.java`, `WebConfig.java`.
