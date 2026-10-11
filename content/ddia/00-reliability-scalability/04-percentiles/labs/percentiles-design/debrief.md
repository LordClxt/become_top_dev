**La distribution se lit en percentiles.** Sur ces 20 mesures, la médiane vaut 14 ms, le p95 950 ms, le p99 1 200 ms, et la moyenne 120,2 ms : un chiffre qu'aucun utilisateur n'a jamais vécu.

Trois idées à garder :

- **La queue compte.** Les requêtes lentes touchent souvent les clients les plus précieux, et dans un système composé elles deviennent la norme : `1 − 0,99¹⁰⁰ ≈ 63 %` de requêtes lentes avec 1 % d'appels lents et 100 appels par requête.
- **On n'agrège pas des percentiles.** On additionne des histogrammes, ou on recalcule sur les mesures brutes.
- **On mesure honnêtement** : côté client, avec une charge en boucle ouverte, sinon l'attente en file disparaît des mesures.
