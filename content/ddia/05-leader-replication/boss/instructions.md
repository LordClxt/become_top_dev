Dessine la base répliquée d'une application critique, répartie sur deux datacenters :

- un leader et un follower **synchrone** à Paris (semi-synchrone : au moins deux copies de chaque écriture confirmée), un follower **asynchrone** de lecture à Montréal ;
- un routeur de lectures qui garantit read-your-writes et les lectures monotones ;
- un détecteur de pannes prêt pour le failover ;
- un nouveau follower en cours d'ajout, à partir d'un snapshot ;
- un flux de capture des changements vers l'entrepôt de données.
