Le moteur tient en trois mouvements :

- **Écrire** : un seul chemin, toujours en ajout, dans le segment actif. Rien n'est jamais modifié sur place.
- **Lire** : l'index de hachage en mémoire donne `(segment, offset)` ; un seul seek suffit. L'application ne parcourt jamais les fichiers.
- **Compacter** : en arrière-plan, on lit des segments **fermés** (immuables) et on écrit un nouveau segment sans doublons. Le segment actif n'est pas concerné, c'est ce qui rend la compaction sûre sans verrou.

Les intrus : un cache Redis ou PostgreSQL ne font pas partie du moteur. Le moteur *est* la base.
