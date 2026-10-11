**C'est la ressource qui arrête le zombie, pas le zombie lui-même.** Le client 1 obtient le bail avec le jeton 33, se fige ; son bail expire, le client 2 l'obtient avec le jeton 34 et écrit. Quand le client 1 se réveille et écrit avec 33, le stockage, qui a déjà vu 34, le rejette.

Le service de verrous vit sur au moins trois nœuds qui décident à la majorité : il survit à la panne de l'un d'eux et ne peut pas accorder le même bail à deux clients. Un Redis unique tombe seul et ne donne pas de jeton croissant ; l'heure murale d'un client n'est ni croissante ni digne de confiance (leçon 3).
