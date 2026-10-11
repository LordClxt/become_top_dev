**Mesurer sans file, c'est mentir.** En boucle ouverte, la requête de 10 ms bloque les quatre suivantes : leurs temps de réponse valent 9, 8, 7 et 6 ms alors que leur service ne dure qu'une milliseconde. Moyenne 8 ms, médiane 8 ms, p99 10 ms. En boucle fermée, le même système affiche une moyenne de 2,8 ms et une médiane de 1 ms : tout paraît fluide.

Trois enseignements :

- **Le temps de réponse inclut l'attente.** Le début est `max(arrivée, libération)`, un seul état suffit (l'instant de libération du serveur).
- **Un SLO se vérifie sur des percentiles**, et « dépassé » est strict : ici, le p50 est violé, le p99 non.
- **Un budget d'erreur se consomme.** 99,9 % sur 30 jours autorisent 43,2 min ; après 25 min d'incident, il en reste 18,2.

Et la charge se dimensionne avec ρ : à 4 serveurs ρ = 100 %, la file diverge ; à 6, ρ = 67 % et l'attente reste sous 2.
