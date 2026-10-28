**Deux zones, deux quanta, une seule flèche qui traverse.** La partie client (interface, Quoting, Item Status, base clients) et les opérations internes (interface, Receiving, Assessment, Recycling, base interne) ne partagent ni interface ni base. Le seul lien est la mise à jour du statut par les services internes, à travers un pare-feu à sens unique : un client n'a **aucun** chemin réseau vers l'interne.

On ne fait monter en charge que Quoting et Item Status ; Assessment, qui change sans cesse, se déploie seul. C'est le style service-based à son meilleur : distribué juste ce qu'il faut.
