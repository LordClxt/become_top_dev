## Hint 1
Deux chaînes partent de la gateway : celle des virements (par le vérificateur de fonds) et celle des pseudos (par le log des pseudos).

## Hint 2
Le répartiteur publie dans le log des instructions, jamais dans les soldes. La décision sur un pseudo passe par le flux des décisions avant de revenir à la gateway.

## Hint 3
L'auditeur lit le log des requêtes et les soldes, puis alerte. L'entrepôt est alimenté depuis le log des requêtes et la purge y écrit.
