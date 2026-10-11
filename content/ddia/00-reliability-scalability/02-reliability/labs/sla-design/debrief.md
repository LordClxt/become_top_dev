**En série, on multiplie ; en parallèle, on multiplie les pannes.** Trois services à 99,9 % donnent `0,999³ ≈ 99,7 %`, soit environ 26 heures d'arrêt par an. Deux serveurs à 90 % donnent `1 − 0,1 × 0,1 = 99 %`.

Mais la redondance a deux limites :

- **Le maillon en série plafonne le tout.** Un répartiteur à 99,999 % devant des réplicas parfaits reste à 99,999 %. Après 3 réplicas à 99 %, en ajouter d'autres ne change presque rien.
- **La formule suppose des pannes indépendantes.** Un même bug, une même alimentation ou un déploiement simultané les corrèlent : les erreurs logicielles, elles, frappent *tous* les nœuds d'un coup.

Pour un SLA à quatre neuf (52 minutes par an), on compte donc les composants en série, on place la redondance là où les pannes sont indépendantes, et on répartit les mises à jour dans le temps.
