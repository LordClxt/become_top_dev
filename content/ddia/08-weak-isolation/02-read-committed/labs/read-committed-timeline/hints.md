## Hint 1
Read uncommitted lit la dernière valeur écrite, validée ou non. Read committed lit la dernière valeur **validée**.

## Hint 2
Une écriture faite par une transaction qui abandonne n'a jamais existé pour read committed.

## Hint 3
Le compteur : les deux transactions lisent avant que l'une écrive. Chacune écrit la valeur lue + 1.
