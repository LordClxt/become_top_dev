**Le schéma existe toujours : seule sa place change.** Avec un document, il est *implicite*, dans ton code de lecture ; avec une table, il est *explicite*, vérifié à l'écriture. C'est le typage dynamique contre le typage statique des bases.

La lecture ancienne passe par une mise à niveau (`first, rest, _ := strings.Cut(name, " ")`), jamais en supposant que tous les documents sont au dernier format. Pour une grosse migration, la mise à niveau à la lecture évite le `UPDATE` géant, que ce soit sur des documents ou sur une colonne `NULL` d'une table relationnelle.
