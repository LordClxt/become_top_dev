Une boutique a deux parties aux besoins opposés : l'**administration** du catalogue (quelques gestionnaires, peu de changements) et la **partie client** (prise de commande, forte charge, doit rester ouverte même si l'administration est en maintenance).

Dessine une architecture en **deux quanta** : place chaque bloc dans la zone de son quantum, relie-les, et fais en sorte que la partie client lise le catalogue **sans** appel synchrone vers l'administration ni base partagée.
