## Hint 1
Le conteneur résout d'abord par **type**. Avec deux `PaymentGateway`, demander « un » prestataire est ambigu : il faut lui dire lequel gagne par défaut. Pour le routeur, demande-lui **tous** les prestataires, avec leur nom. Pour la fraude, demande-lui un objet qui *peut* fournir le bean, ou rien.

## Hint 2
Trois outils : `@Primary` sur une méthode `@Bean` ; un paramètre de type `Map<String, PaymentGateway>` (clé = nom du bean) ; un paramètre de type `ObjectProvider<FraudCheck>`.

## Hint 3
`@Primary` sur `stripe()`. `PaymentRouter(Map<String, PaymentGateway> gateways)` garde une copie triée (`new TreeMap<>(gateways)`) et lève l'erreur avec `String.join(", ", gateways.keySet())`. `Refunds` garde l'`ObjectProvider` et appelle `getIfAvailable()` au moment du remboursement : `null` veut dire « pas de contrôle ».
