**Le trade-off ne se tranche pas toujours en bloc.** Les flux sensibles (capture, tracking) passent par des **files dédiées** : un espion volerait des messages et serait détecté, et chaque consommateur se dimensionne selon la profondeur de sa file. L'analytique passe par **un topic** : l'équipe data abonnera ses prochains consommateurs sans toucher au producteur.

Le prix de cette hybridation : le producteur connaît trois canaux au lieu d'un, et un nouveau flux sensible demandera de le modifier. C'est un prix assumé, que l'on écrirait dans un ADR.
