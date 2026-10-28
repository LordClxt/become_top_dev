**Six Managers pour six tables : le piège des entités.** La proposition recopie la base, ne dit rien des workflows, et produit des composants trop gros qui n'aident pas à ranger le code. Le test le révèle : une seule action métier (une location étudiante avec dépassement) touche les **six** composants.

Pour le back-office purement CRUD, un framework de génération suffit : pas d'architecture à concevoir. Pour le reste, la technique dépend du contexte : event storming pour du DDD par événements, acteurs/actions pour des rôles distincts dans un process formel, workflows sans messagerie.
