## Contexte

**Nébula**, une néobanque, traite **20 000 paiements par seconde**. Elle veut :

- détecter la fraude **en temps réel** (une carte utilisée dans deux pays en 30 minutes, 5 paiements en une minute) et prévenir le client **une seule fois** par alerte ;
- un **tableau de bord** du volume par marchand sur des fenêtres de 5 minutes, exact malgré les pannes.

## Ta mission

Dessine la plateforme :

- le paiement entre par la gateway, est enregistré dans le grand livre et publié sur le flux des transactions ;
- l'opérateur de fraude **enrichit** chaque transaction avec le profil du client, sans jamais interroger la base des clients, et garde son état durable ;
- les alertes passent par un sujet avant d'atteindre la notification ;
- l'opérateur d'agrégats alimente le tableau de bord, lui aussi avec un état durable.

Les fenêtres se ferment sur le **temps de l'événement**, et aucune donnée de référence ne doit vieillir.
