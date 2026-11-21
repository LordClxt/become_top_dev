## Contexte

Quand un client choisit ses places, Tixa les bloque dans une `SeatHold` le temps du paiement. Le support remonte un bug grave : **deux clients voient les places l'un de l'autre** dans leur panier. Et au redéploiement, des places restent bloquées pour toujours.

Tu édites `HoldConfig.java` et `HoldDesk.java`. `SeatHold` et `ReleaseLog` sont fournis.

## 1. Une réservation par client

`HoldDesk` est un singleton : un seul guichet pour toute l'application. Chaque appel à `open()` doit renvoyer une **nouvelle** `SeatHold`, créée par le conteneur. `SeatHold` doit être déclaré en portée **prototype**.

## 2. Tout libérer à l'arrêt

Quand le conteneur s'arrête (`ctx.close()`), **toutes** les réservations ouvertes doivent être libérées (`release()`), et le journal doit recevoir une seule ligne :

```
2 réservations libérées
```

(avec le nombre de réservations ouvertes). Une réservation ne doit pas être libérée avant l'arrêt.

## Attention

`SeatHold.release()` porte déjà `@PreDestroy`. Demande-toi si le conteneur l'appellera vraiment.
