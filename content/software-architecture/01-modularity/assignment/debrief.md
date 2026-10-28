**money (D = 1) est le point dur du découpage** : tout le monde l'importe et il est entièrement concret. Avant de séparer les services, il lui faut une abstraction stable (un type `Cents` partagé, une interface d'opérations).

**BidService a trois groupes** : le cœur des enchères, le transcodage vidéo et la signature d'audit. Les deux derniers ne partagent rien avec le reste et rejoindront naturellement leurs futurs services.

Aux frontières, la priorité est la connascence la plus forte et la plus distante : les **valeurs liées** (x3), qui deviendront une transaction distribuée si on ne choisit pas un propriétaire unique de l'offre gagnante. Le sens (x1) se règle par un type, l'algorithme (x2) par une implémentation partagée, et le nom (x4) est déjà la forme la plus faible.
