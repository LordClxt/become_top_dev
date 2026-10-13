Tinybase doit maintenant tenir sur plusieurs nœuds. Tu implémentes la **réplication par leader** :

1. **Jalon 1** : un `Leader` numérote ses écritures (LSN) dans un log ; un `Follower` les applique dans l'ordre, refuse un trou (`ErrGap`), ignore un rejeu, et se rattrape avec `CatchUp`.
2. **Jalon 2** : un instantané cohérent pour créer un follower, le retard (`Lag`), le choix du plus avancé (`MostUpToDate`), la promotion (`Promote`) et les écritures perdues (`LostWrites`).
3. **Jalon 3** : un `Router` qui envoie les écritures au leader et choisit pour chaque lecture un follower assez avancé pour la session.

Tout est dans `replication.go`. Lance les tests avec le bouton « Lancer les tests » : ceux de chaque jalon commencent par `TestM1`, `TestM2` ou `TestM3` dans les résultats. Commence par faire passer les `TestM1`, les suivants peuvent échouer en attendant.
