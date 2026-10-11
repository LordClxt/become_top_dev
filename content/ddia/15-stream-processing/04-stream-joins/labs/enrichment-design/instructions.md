## Contexte

Une boutique en ligne reçoit **50 000 événements d'activité par seconde** depuis son application mobile. L'équipe analytique veut chaque événement **enrichi** avec le profil du client (âge, pays, segment), et la base PostgreSQL des profils tient à peine 2 000 lectures par seconde.

## Ta mission

Dessine une **jointure flux-table** :

- l'application publie ses événements sur le flux d'activité ;
- le service profils écrit dans la base, dont les changements sortent par **capture des changements** ;
- l'opérateur d'enrichissement consomme **les deux flux** et tient une **copie locale** des profils ;
- le flux enrichi alimente l'entrepôt.

Aucune requête ne doit partir de l'opérateur vers la base, et la copie des profils ne doit jamais vieillir.
