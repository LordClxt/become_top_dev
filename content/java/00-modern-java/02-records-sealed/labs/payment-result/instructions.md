## Contexte

La passerelle de paiement répond par une ligne de texte. Le code actuel la range dans une classe fourre-tout `PaymentResult` avec un `status` et trois champs nullables : la semaine dernière, un `APPROVED` sans code d'autorisation est parti en comptabilité.

```text
OK;A1B2C3;1250                       → approuvé, code A1B2C3, 12,50 €
KO;insufficient_funds;true           → refusé, raison, peut-on réessayer
WAIT;https://3ds.bank.example/abc    → en attente d'une authentification forte
```

## Ta mission

Dans `PaymentResult.java`, remplace la classe par une **interface scellée** `PaymentResult` et trois **records** qui l'implémentent :

| record | composants | invariants (sinon `IllegalArgumentException`) |
|---|---|---|
| `Approved` | `String authCode`, `long amountCents` | code de 6 caractères `A-Z` ou `0-9` ; montant > 0 |
| `Declined` | `String reason`, `boolean retryable` | raison non vide (après `strip`) |
| `Pending` | `String redirectUrl` | commence par `https://` |

Un composant `null` lève `NullPointerException`.

Ajoute à l'interface `static PaymentResult fromGateway(String line)`, qui lit une ligne de la passerelle (voir ci-dessus) et lève `IllegalArgumentException` pour toute ligne mal formée : préfixe inconnu, mauvais nombre de champs, nombre illisible, `retryable` autre que `true`/`false`.

Les trois records restent dans le même fichier : `permits` est alors facultatif.
