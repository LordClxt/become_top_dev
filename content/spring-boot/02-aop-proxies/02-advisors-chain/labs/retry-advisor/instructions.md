## Contexte

Le prestataire de paiement de Tixa est parfois indisponible quelques secondes. Réessayer un **paiement** est sûr (il est idempotent : même clé, même paiement). Réessayer un **remboursement** ne l'est pas : on rembourserait deux fois. Il faut donc un comportement qui ne s'applique **qu'à certaines méthodes** : un *advisor*.

Tu écris `RetryAdvisor.java` et `Chains.java`. L'annotation `@Retry`, le client et sa version capricieuse (`FlakyPaymentClient`, qui échoue les n premières fois) sont fournis. Note que `@Retry` est posée sur l'**implémentation** (`FlakyPaymentClient.charge`), pas sur l'interface.

## 1. `RetryAdvisor`

Un `org.springframework.aop.PointcutAdvisor` :
- son **pointcut** ne vise que les méthodes annotées `@Retry` dans la classe cible ;
- son **advice** réessaie la méthode tant qu'elle lève une `RuntimeException`, jusqu'à `attempts` tentatives au total ; au-delà, la dernière exception remonte telle quelle.

## 2. `Chains.resilient(target, ticker, metrics)`

Un proxy (avec `ProxyFactory`) qui porte **deux** comportements :
- une mesure de durée, comme à la leçon précédente (`FlakyPaymentClient.charge 10`) ;
- le `RetryAdvisor`.

La mesure doit **envelopper** le retry : un appel qui réussit à la troisième tentative donne **une seule** mesure, qui couvre les trois tentatives.
