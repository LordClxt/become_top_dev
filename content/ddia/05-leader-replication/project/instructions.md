Tinybase doit maintenant tenir sur plusieurs nœuds. Tu implémentes la **réplication par leader** :

1. **Jalon 1** : un `Leader` numérote ses écritures (LSN) dans un log ; un `Follower` les applique dans l'ordre, refuse un trou (`GapError`), ignore un rejeu, et se rattrape avec `catchUp`.
2. **Jalon 2** : un instantané cohérent pour créer un follower (`new Follower(leader.snapshot())`), le retard (`lag`), le choix du plus avancé (`mostUpToDate`), la promotion (`follower.promote()`) et les écritures perdues (`lostWrites`).
3. **Jalon 3** : un `Router` qui envoie les écritures au leader et choisit pour chaque lecture un follower assez avancé pour la session.

Tout est dans `replication.ts`. Lance les tests avec le bouton « Lancer les tests » : ceux de chaque jalon commencent par `M1`, `M2` ou `M3` dans les résultats. Commence par faire passer les `M1`, les suivants peuvent échouer en attendant.

Ici tout tourne dans un seul processus JavaScript : pas besoin de verrou, chaque méthode s'exécute d'un bloc. Dans un vrai cluster, leader et followers sont des machines distinctes et les messages se croisent : c'est pour ça que tout passe par des LSN.
