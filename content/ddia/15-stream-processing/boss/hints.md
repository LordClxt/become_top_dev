## Hint 1
Le service paiements écrit dans le grand livre et publie sur le flux : il n'appelle jamais l'opérateur de fraude directement.

## Hint 2
Le profil client arrive à l'opérateur de fraude par le changelog, et vit dans sa copie locale. Les deux opérateurs écrivent leurs checkpoints sur le stockage objet.

## Hint 3
La notification ne reçoit rien d'autre que le sujet des alertes : un e-mail parti ne se reprend pas, donc la notification doit pouvoir reconnaître une alerte déjà envoyée. Les trois blocs pièges ne servent à rien.
