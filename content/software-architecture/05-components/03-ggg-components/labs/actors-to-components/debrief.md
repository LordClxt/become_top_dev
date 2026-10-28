**Chaque action trouve son composant, et les caractéristiques en dédoublent un.** Les enchérisseurs et le commissaire-priseur ont chacun leur capture ; BidTracker unifie les deux flux et reste la référence ; les deux diffuseurs offrent une vue en lecture seule ; AuctionSession clôt la vente et déclenche le paiement.

Ce n'est pas un design définitif (inscription, administration…), mais un substrat à gros grain sur lequel itérer. Et il rend visible ce qui suit : ces composants n'ont pas les mêmes caractéristiques, donc l'architecture sera distribuée.
