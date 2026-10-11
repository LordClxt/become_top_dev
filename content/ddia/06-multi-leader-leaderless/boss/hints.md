## Hint 1
Pars de l'app : elle écrit dans sa base locale (un leader hors ligne), qui se synchronise de façon asynchrone avec le service panier, qui appelle le coordinateur.

## Hint 2
Le coordinateur et les trois réplicas d'origine sont en Europe ; il écrit sur ces réplicas, envoie l'écriture en asynchrone aux réplicas d'Asie et confie une copie au nœud voisin, qui la rend à un réplica d'origine (hinted handoff).

## Hint 3
L'anti-entropie réplique vers les réplicas d'origine, la supervision les lit. Le résolveur LWW jetterait des ajouts ; le leader et le verrou global bloqueraient les écritures à la première panne.
