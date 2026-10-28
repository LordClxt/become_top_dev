Going, Going, Gone doit diffuser chaque offre du **Bid Producer** à quatre services. Les exigences :

- **Bid Capture** et **Bid Tracking** manipulent des données sensibles : toute écoute doit être détectable, et chacun doit monter en charge indépendamment selon la profondeur de **son** canal.
- **Bid Analytics** et **Bid History** évoluent vite : l'équipe data ajoutera d'autres consommateurs sans vouloir toucher au producteur.
- Aucun service ne doit voler les messages d'un autre, et les services ne communiquent pas par une base partagée.
- Toute la diffusion est asynchrone.

Dessine la topologie. Aucun indice : chaque règle non respectée met en évidence les blocs fautifs.
