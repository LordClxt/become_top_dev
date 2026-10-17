## Ce que ce combat évaluait

- **Un module configurable propre.** `ConfigurableModuleBuilder` avec `setClassMethodName('forRoot')` donne `forRoot` et `forRootAsync` ; `setExtras` porte `isGlobal` sans le mêler aux options injectées.
- **Échouer tôt.** Valider `defaultChannel` dans le constructeur du service (ou dans une fabrique) fait échouer le démarrage, au lieu d'échouer au premier envoi en production.
- **Un registre plutôt qu'un `if`.** Chaque canal est un provider ; un `ChannelRegistry` les indexe par nom. Ajouter un canal WhatsApp ne touche plus au service.
- **La contagion maîtrisée.** Un `TenantContext` request-scoped injecté dans `NotificationsService` l'aurait recréé à chaque requête, et avec lui l'historique s'il y vivait. Lire l'en-tête dans le contrôleur et passer le locataire en argument garde toute la chaîne en singletons. Avec un très grand nombre de services qui ont besoin du locataire, un stockage `AsyncLocalStorage` rempli à l'entrée de la requête est l'étape suivante (chapitre 03).
- **L'état durable isolé.** L'historique vit dans un `Outbox` singleton, filtré par locataire.
