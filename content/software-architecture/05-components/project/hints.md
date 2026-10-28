## Hint 1
`domainOf` : retire la racine, puis prends ce qui précède le premier `/` du reste ; s'il n'y en a pas, le fichier est à la racine.

## Hint 2
Pour les cycles de domaines, un domaine est sur un cycle si, en partant de ses voisins, on peut revenir à lui. Avec quelques dizaines de domaines, un parcours par domaine suffit largement.

## Hint 3
Pour l'impact, inverse le graphe des domaines (qui dépend de qui), puis fais un parcours en largeur depuis les domaines modifiés en marquant les domaines déjà vus.
