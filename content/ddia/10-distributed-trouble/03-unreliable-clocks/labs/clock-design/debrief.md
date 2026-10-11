**L'écriture du client n'a pas échoué : elle a été jetée.** L'ancienne adresse porte l'horodatage 2 080 (nœud en avance de 80 ms), la nouvelle 2 025 (nœud en retard de 15 ms). LWW garde la plus grande. Pendant 95 ms après l'ancienne écriture, rien de ce qui passe par le nœud 3 ne peut l'écraser : la somme des deux décalages.

Un nœud coupé de NTP dérive vite (4,32 s en 6 h à 200 ppm), et sans supervision personne ne le voit : une horloge fausse ne plante pas, elle corrompt. Les vrais remèdes : surveiller les décalages, plusieurs sources NTP, et surtout ne pas confier l'ordre des écritures à des horloges physiques (versions, horloges logiques).

Quand on veut quand même ordonner par le temps, il faut raisonner en **intervalles** : seuls deux intervalles disjoints donnent un ordre certain. Spanner attend la largeur de l'intervalle avant de valider, d'où l'importance de la garder petite : 100 ms d'attente par écriture sans GPS, 7 ms avec.
