**La connascence synchrone a aligné Enchères sur Paiement.** Pendant l'appel, 40 instances élastiques n'allaient pas plus vite qu'un prestataire à un débit toutes les 500 ms : en 15 s, au plus **30** clôtures réussissent, les 90 autres expirent. L'élasticité d'Enchères était inutile sur ce chemin.

Avec une **file**, les 120 paiements sont traités en **60 s**, sans aucun échec ; l'enchère passe par un état « paiement en attente », puis « payée » quand l'événement arrive. Enchères et Paiement deviennent **deux quanta**, chacun avec ses caractéristiques. C'est exactement l'exemple du livre.
