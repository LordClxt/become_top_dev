Conçois le traitement des commandes en **médiateur**, avec une touche **broker** en sortie :

- la boutique dépose `PlaceOrder` dans la **file d'événements initiateurs** ; le **médiateur** la consomme ;
- le médiateur envoie ses **commandes** sur des **files dédiées** (paiement, stock) ; chaque processeur **répond au médiateur** ;
- le médiateur **persiste l'état** de chaque commande, pour reprendre après une erreur ;
- un processeur qui rencontre un message en erreur le **délègue** au processeur d'erreurs, qui **répare et resoumet** dans la file d'origine, ou l'envoie au **tableau de bord** ; une personne corrige et resoumet ;
- quand la commande est expédiée, le médiateur **publie** `order-shipped` sur un **topic** ; Notification et Analytics s'y abonnent ;
- les processeurs de la topologie médiateur ne publient **rien** sur le topic eux-mêmes.

Aucun indice : chaque règle non respectée met en évidence les blocs fautifs.
