**Le p99 d'un système composé se joue sur trois leviers.**

1. **La charge** : `600 × 20 = 12 000` appels/s, soit 300 workers occupés en permanence (`12 000 × 0,025`). Un parc de 300 est à 100 % : la file diverge.
2. **L'utilisation** : à 70 %, il faut `300 / 0,7 ≈ 430` workers ; 440 donnent 68 %. Le coût monte vite quand on veut plus de marge.
3. **La queue** : `1 − 0,995²⁰ ≈ 9,5 %` des requêtes utilisateur sont lentes avec seulement 0,5 % d'appels lents. Ajouter des workers n'y change rien : il faut **réduire la proportion d'appels lents** (0,25 % donne 4,9 %).

Et on publie le p99 du cluster en **additionnant des histogrammes**, jamais en moyennant des percentiles.
