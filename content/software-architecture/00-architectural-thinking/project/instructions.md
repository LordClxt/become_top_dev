## archkit, épisode 1

Une règle d'architecture qui n'est pas vérifiée finit violée. Tu vas écrire la première fitness function d'**archkit**, la boîte à outils qui grandira à chaque module : un vérificateur de couches, comme ArchUnit ou dependency-cruiser.

L'entrée est un **graphe d'imports** (`Graph` : module → modules importés) et des **règles** : les couches de haut en bas, chacune avec un préfixe de chemin, éventuellement **ouverte**, plus des **variances** accordées par l'ARB.

### Règles d'un import `from → to`
- Même couche, ou couche **juste en dessous** : permis.
- Couche **au-dessus** : violation `upward`.
- Couche plus bas en sautant des couches : permis seulement si **toutes** les couches sautées sont ouvertes, sinon `skip`.
- Module sans couche (d'un côté ou de l'autre) : `unknown-layer`.
- Un module appartient à la couche dont le préfixe est **le plus long**.

### Variances
Une variance couvre **un import précis** (`from`, `to`). La violation couverte passe dans `waived`. Une variance qui ne couvre rien est **périmée** (`unusedVariances`). Une variance sans raison ou sans approbateur lève `InvalidVarianceError`.

Les violations sont triées par module source puis par cible, et un import en double ne compte qu'une fois. Le message de chaque violation cite les couches (ou le module) en jeu : c'est ce que lira le développeur dans la CI.
