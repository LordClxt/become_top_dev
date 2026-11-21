## Contexte

Tixa accepte maintenant deux prestataires de paiement : Stripe et PayPal. Depuis qu'on a ajouté le second, **l'application ne démarre plus**. Lance les tests et lis le message : c'est le conteneur qui refuse de choisir à ta place.

Tu édites `PaymentConfig.java`, `PaymentRouter.java` et `Refunds.java`. Les prestataires (`Gateways`), `PaymentGateway`, `FraudCheck` et `Checkout` sont fournis.

## 1. Un prestataire par défaut

`Checkout` demande **un** `PaymentGateway` : il doit recevoir **Stripe**, sans que `Checkout` change.

## 2. Router par nom

`PaymentRouter.charge(method, amount)` utilise le prestataire dont le **nom de bean** est `method` (`"stripe"`, `"paypal"`). Un prestataire ajouté plus tard au conteneur (un bean `lydia`, par exemple) doit être routable **sans modifier le routeur**.

Moyen inconnu : `IllegalArgumentException` avec exactement ce message (moyens triés par ordre alphabétique) :

```
moyen de paiement inconnu : bitcoin (disponibles : paypal, stripe)
```

## 3. Une dépendance optionnelle

Seuls certains déploiements ont un contrôle anti-fraude (`FraudCheck`). Sans lui, l'application doit **démarrer quand même** et rembourser sans contrôle. Avec lui, un remboursement qu'il refuse lève `IllegalStateException`.

## Contraintes

- Ne crée pas de faux `FraudCheck` pour faire démarrer l'application.
- Le choix se fait dans la configuration et les signatures, pas avec des `if` sur des noms de classes.
