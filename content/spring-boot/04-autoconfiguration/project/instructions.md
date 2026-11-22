## Contexte

Le client du prestataire de paiement de Tixa est réclamé par trois autres équipes. Le copier-coller est exclu : tu en fais un **starter**. Une application qui l'ajoute à ses dépendances doit recevoir un client configuré sans rien importer, pouvoir l'ajuster, le remplacer, et profiter des métriques si elle utilise aussi la bibliothèque de métriques maison (`tixa.metrics`, optionnelle).

Fournis : `PaymentClient`, `PaymentClientCustomizer`, `PaymentMetrics`, `tixa.metrics.MeterSink`, et `app.TixaApp`. Le paquet `tixa` n'est pas scanné par l'application. Tests par jalon : `jboot M1`, `M2`, `M3`.

## M1 — Le client autoconfiguré

- `PaymentProperties` (préfixe `tixa.payment`) : `endpoint` (défaut `https://pay.tixa.example`) et `api-key`.
- `PaymentAutoConfiguration` fournit un `PaymentClient` **seulement si `tixa.payment.api-key` est défini**, et jamais si l'application déclare le sien.
- Spring Boot la trouve tout seul (fichier `imports`).

## M2 — Les customizers

Le client reçoit les en-têtes ajoutés par tous les `PaymentClientCustomizer` de l'application, dans l'ordre de leur `@Order`.

## M3 — Les métriques, si possible

`PaymentMetricsAutoConfiguration` :
- ne s'applique que si `tixa.metrics.MeterSink` est sur le classpath ;
- fournit un `MeterSink` si l'application n'en a pas ;
- enregistre un `PaymentMetrics` **seulement si un `PaymentClient` existe** ; elle doit donc être évaluée **après** `PaymentAutoConfiguration`, quel que soit leur nom.

Sans la bibliothèque de métriques, l'application démarre normalement.
