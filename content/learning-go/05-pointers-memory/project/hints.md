## Hint 1
Pour le jalon 1, une `map[string]string` et une capacité suffisent. Garde une structure facile à étendre : tu auras besoin de retrouver un **maillon** par sa clé, donc plutôt `map[string]*entry` où `entry` contient la clé, la valeur et deux pointeurs.

## Hint 2
Pour le jalon 2, crée deux maillons sentinelles `head` et `tail` reliés l'un à l'autre au départ. Écris deux petites fonctions : `unlink(e)` (le précédent et le suivant de `e` se désignent mutuellement) et `pushFront(e)` (insère `e` juste après `head`). `Get` fait `unlink` puis `pushFront`. Le moins récent est `tail.prev`.

## Hint 3
Quand tu évinces, supprime aussi la clé de la map : il te faut donc la clé dans le maillon. Dans `Put`, teste d'abord si la clé existe (mise à jour = pas d'éviction). Pour `Keys`, parcours de `head.next` jusqu'à `tail`. `Peek` fait seulement une lecture dans la map : aucun `unlink`.
