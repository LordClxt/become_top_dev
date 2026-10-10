## Hint 1
La récursion est naturelle : un arbre est une racine plus deux sous-arbres, qui sont des arbres. `Insert(root, v)` : si `root == nil`, renvoie un nouveau nœud ; sinon descends à gauche ou à droite en **réaffectant** le résultat (`root.Left = Insert(root.Left, v)`) et renvoie `root`.

## Hint 2
`Delete` : après avoir descendu jusqu'au nœud, traite d'abord « pas d'enfant gauche » (renvoie `root.Right`) et « pas d'enfant droit » (renvoie `root.Left`) : cela couvre à la fois le cas feuille et le cas à un enfant. Reste le cas à deux enfants : copie la valeur du successeur (`Min(root.Right)`) dans le nœud et supprime-la du sous-arbre droit.

## Hint 3
`Walk` doit pouvoir s'arrêter tôt : une fonction auxiliaire qui renvoie un booléen « on continue ? » permet d'enchaîner `walk(gauche) && visit(valeur) && walk(droite)` et de court-circuiter naturellement. `FromSorted` : l'élément du milieu devient la racine, `values[:mid]` construit le sous-arbre gauche et `values[mid+1:]` le droit. `Equal` : deux arbres `nil` sont égaux, un seul `nil` ne l'est pas.
