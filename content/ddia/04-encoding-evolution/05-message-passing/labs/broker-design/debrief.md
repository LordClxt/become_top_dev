**Le broker découple l'émetteur des destinataires.** Le service publie sur un sujet ; le broker stocke le message et le livre à chaque consommateur — notification, analytique, et ceux qu'on ajoutera plus tard — sans que l'émetteur connaisse leur adresse. Un consommateur lent ou en panne ne bloque pas l'émetteur.

Le broker ne transporte que des octets : c'est à toi d'utiliser un encodage compatible et, par exemple, un registre de schémas pour vérifier les changements **avant** de déployer.
