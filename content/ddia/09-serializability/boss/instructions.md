Ta plateforme de réservation de salles a connu des doubles réservations. Dessine l'architecture corrigée : les utilisateurs passent par une gateway et un service ; les réservations vivent dans une base PostgreSQL en isolation sérialisable (SSI), dont l'index sur le créneau sert à détecter les prémisses périmées ; les quotas par entreprise sont tenus par des scripts Lua exécutés en série dans Redis ; les rapports d'occupation lisent sans gêner personne.

Écarte tout ce qui réintroduirait une décision sur une prémisse périmée ou un blocage global.
