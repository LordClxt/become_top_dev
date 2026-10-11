**Un portefeuille correct combine presque tout le chapitre.** La transaction regroupe le verrou du compte, le débit et l'écriture comptable : atomiques, elles sont validées ou abandonnées ensemble, et le service peut **réessayer** sans risque grâce à la clé d'idempotence de la gateway. Le `FOR UPDATE` sur la ligne du compte, qui existe toujours, ferme la porte au write skew (deux paiements qui voient chacun un solde suffisant) comme à la mise à jour perdue.

L'e-mail sort de la base : il part **après** le commit, par une file, pour ne pas être renvoyé à chaque essai. La sauvegarde et le contrôle d'intégrité lisent leur **instantané** MVCC sans bloquer personne, donc sans read skew.

Les pièges rouvraient chacun une anomalie : un cache de soldes lu hors transaction (la vérification n'est plus là où se fait l'écriture), un solde en LWW (les débits concurrents s'écrasent), et un `solde += montant` d'ORM (un cycle lire-modifier-écrire).
