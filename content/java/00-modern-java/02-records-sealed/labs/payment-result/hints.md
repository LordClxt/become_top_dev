## Hint 1
`sealed interface PaymentResult permits Approved, Declined, Pending { … }` puis trois `record X(…) implements PaymentResult { … }` dans le même fichier. Une interface peut avoir des méthodes `static`.

## Hint 2
Valide dans chaque **constructeur compact** : `Approved { Objects.requireNonNull(authCode); if (!authCode.matches("[A-Z0-9]{6}")) throw … }`. Ainsi, même `fromGateway` ne peut pas fabriquer un objet invalide.

## Hint 3
`line.split(";", -1)` puis un `switch` sur `parts[0]` : `case "OK" -> new Approved(parts[1], Long.parseLong(parts[2]))`. Vérifie la longueur de `parts` dans chaque branche, et transforme une `NumberFormatException` en `IllegalArgumentException`. Pour `retryable`, `Boolean.parseBoolean` accepte n'importe quoi : compare toi-même à `"true"` et `"false"`.
