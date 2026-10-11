**Un timeout est un compromis, jamais une vérité.** Le calcul 2d + r (ici 56 ms) suppose des bornes que nos réseaux et nos serveurs ne donnent pas. En vrai, les délais ont une longue traîne : avec un timeout de 100 ms, presque un battement sur dix serait une fausse alerte.

Et une fausse alerte n'est pas anodine : sur 4 nœuds à 80 %, accuser à tort l'un d'eux pousse les trois autres à 106,7 % de leur capacité. Ils ralentissent, sont accusés à leur tour : c'est la **panne en cascade**.

Le bon réglage (par exemple un battement toutes les 500 ms et un timeout de 500 ms : moins d'une fausse alerte par jour, détection en 1 s) vient de **mesures**, et le meilleur détecteur ajuste ce réglage tout seul, nœud par nœud, à partir de la moyenne et de la gigue observées : c'est l'idée du **phi accrual**.
