Le service commandes publie 600 commandes payées par seconde. La **facturation** doit traiter chaque commande une fois, mais une facture prend 2 ms : un seul worker ne suit pas. L'**e-mail** doit, lui aussi, voir chaque commande. Dessine le broker, les deux groupes de consommateurs avec leurs workers, les livraisons et les accusés de réception.

Conventions : livraison du broker vers un worker = flèche `async` ; accusé de réception d'un worker vers le broker = flèche `sync` (étiquette « ack »).
