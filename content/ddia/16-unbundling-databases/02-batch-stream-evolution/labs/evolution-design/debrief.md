**Retraiter, c'est relire le log avec une nouvelle fonction.** 4,8 To à 2 000 Mo/s prennent 40 minutes : assez court pour qu'on construise une vue entièrement nouvelle plutôt que de migrer l'ancienne en place.

**La migration progressive coûte de l'espace (320 Go pendant la transition) mais achète la réversibilité.** Tant que l'ancienne vue suit le flux, un bug découvert à 50 % se règle en renvoyant les lecteurs vers elle, puis en corrigeant la dérivation et en relançant le retraitement. Une correction à la main dans la vue serait effacée au prochain recalcul.

Lambda faisait la même chose avec deux codes (lots exacts, flux approximatif). Un moteur unifié qui rejoue le log, garantit exactly-once et fenêtre sur le **temps de l'événement** fait le même travail avec un seul code.
