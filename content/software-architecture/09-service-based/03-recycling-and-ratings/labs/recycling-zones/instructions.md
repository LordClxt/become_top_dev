Dessine le recyclage électronique en service-based avec **deux zones réseau** :

- **Zone externe** : l'interface clients, Quoting, Item Status et la base clients.
- **Zone interne** : l'interface opérations, Receiving, Assessment, Recycling et la base interne.
- Le **pare-feu est à sens unique** : les services internes peuvent mettre à jour la base clients (statut des appareils), mais **rien** de la zone externe n'atteint la zone interne.
- Les services ne s'appellent **pas** entre eux.
