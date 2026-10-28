Dessine Going, Going, Gone en **cinq quanta** : enchérisseur, commissaire-priseur, suivi des offres, retour enchérisseur, paiement.

- Chaque interface parle en **synchrone** à son service de capture, dans son propre quantum.
- Les deux captures transmettent leurs offres à **Bid Tracker** sans jamais l'appeler en synchrone : un pic d'enchérisseurs ne doit pas ralentir le commissaire-priseur.
- Bid Tracker est le seul à écrire dans la base des offres, et diffuse les offres ordonnées vers Bid Streamer en **asynchrone** ; Bid Streamer pousse le fil vers les navigateurs en asynchrone.
- En fin de vente, Bid Tracker déclenche le paiement **sans appel synchrone** à Payment.

Aucun indice : chaque règle non respectée met en évidence les blocs fautifs.
