Un grossiste reçoit des commandes au format EDI. Conçois le pipeline :

- toute commande est lue, parsée, puis **validée** ; une commande invalide part aux **rejets** ;
- une commande valide passe ensuite par le **testeur de fraude** (ajouté cette année, sans modifier les autres filtres) ; une commande suspecte part en **revue manuelle** ;
- les autres sont aiguillées : professionnel → transformateur B2B → ERP ; particulier → transformateur B2C → boutique ;
- les consommateurs sont des points d'arrivée : ils n'envoient rien plus loin.

Aucun indice : chaque règle non respectée met en évidence les blocs fautifs.
