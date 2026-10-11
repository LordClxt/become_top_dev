## Hint 1
Pose une zone « Transaction de paiement » et place dedans le verrou du compte et le débit. Le service appelle le verrou, qui précède le débit ; tous deux écrivent dans PostgreSQL.

## Hint 2
L'e-mail ne reçoit rien d'autre que la file. C'est le service qui publie dans la file, de façon asynchrone, une fois la transaction validée.

## Hint 3
Sauvegarde et contrôle : des flèches de lecture vers la base ; la sauvegarde écrit dans le stockage. Les trois derniers blocs de la palette sont des pièges : cache hors transaction, LWW et cycle lire-modifier-écrire de l'ORM.
