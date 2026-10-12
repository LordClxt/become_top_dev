## Hint 1
Trois services, trois bases : stock en série (Redis), paiements en SSI (PostgreSQL), reporting sur un réplica d'instantané.

## Hint 2
Le reporting ne doit jamais toucher les bases transactionnelles.

## Hint 3
Aucun gestionnaire de verrous global ni transaction interactive avec saisie utilisateur.
