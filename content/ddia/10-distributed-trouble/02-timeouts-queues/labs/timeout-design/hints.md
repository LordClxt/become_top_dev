## Hint 1
Une réponse fait un aller, un traitement et un retour. La charge d'un nœud déclaré mort ne disparaît pas : elle se répartit.

## Hint 2
Dans le réglage, chaque tranche de 40 ms ajoutée au timeout divise la probabilité de fausse alerte par environ 2,7. Le pire délai de détection vaut l'intervalle plus le timeout.

## Hint 3
Un timeout d'environ 500 ms suffit à rendre les fausses alertes rares ; il reste alors à choisir un intervalle qui tient dans 1,5 s au total sans dépasser 5 battements par seconde.
