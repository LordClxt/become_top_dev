## Contexte

`payments.ts` (fourni) contient un `CheckoutService` qui demande quatre dépendances : une `PaymentGateway` (classe abstraite), la configuration `PAYMENTS_CONFIG`, les taux de change `FX_RATES` et, en option, un journal `AUDIT_SINK`. Le module, lui, ne déclare que `CheckoutService` : l'application ne démarre pas.

Complète `PaymentsModule` dans `payments.module.ts`.

## Ce qui est attendu

| Jeton | Provider |
|---|---|
| `PAYMENTS_CONFIG` | la valeur `{ mode: 'test', currency: 'EUR' }` |
| `FX_RATES` | le résultat de `loadRates()`, qui est **asynchrone** |
| `PaymentGateway` | `LiveGateway` si `config.mode === 'live'`, sinon `FakeGateway` ; le choix dépend de la configuration **injectée** |
| `LEGACY_GATEWAY` | un **alias** de `PaymentGateway` : la même instance |

Exporte `CheckoutService`, `PaymentGateway` et `LEGACY_GATEWAY`. Un module consommateur doit pouvoir injecter les trois.

## Contraintes

- Les tests remplacent `PAYMENTS_CONFIG` par `overrideProvider(...)` : la passerelle doit donc lire la configuration par injection, pas via une variable du fichier.
- Une seule passerelle doit être créée.
- Ne fournis pas `AUDIT_SINK` : il reste facultatif.
