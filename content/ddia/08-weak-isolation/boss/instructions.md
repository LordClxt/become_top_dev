Dessine le cœur d'un portefeuille électronique qui tourne sur PostgreSQL en **repeatable read** (snapshot isolation). Contraintes :
- un paiement est **une** transaction : on verrouille d'abord la ligne du compte, puis on débite et on écrit au grand livre, dans la même zone « Transaction de paiement » (sinon deux paiements simultanés peuvent chacun voir un solde suffisant : write skew, ou débit perdu) ;
- l'e-mail de confirmation est un effet de bord : il ne doit partir qu'**après** le commit, via une file, pour ne pas être renvoyé à chaque nouvel essai ;
- la sauvegarde et le contrôle d'intégrité lisent la base dans leur instantané, sans arrêter les paiements ;
- aucun raccourci qui rouvre une mise à jour perdue.
