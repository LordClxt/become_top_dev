## Hint 1
`try (Res a = …; Res b = …) { … }` : c'est le *try-with-resources*. Chaque ressource déclarée entre parenthèses est fermée automatiquement, dans l'ordre **inverse** de déclaration, même en cas d'exception, et seulement si elle a été ouverte.

## Hint 2
Le try-with-resources garde l'exception du corps comme exception principale et ajoute celles des `close()` avec `addSuppressed`. C'est exactement le comportement demandé : remplace les deux `try/finally` imbriqués par un seul try-with-resources sur les deux `get()`.

## Hint 3
Pour `Connection` : `implements AutoCloseable`, un champ `private boolean closed`. Dans `close()`, `if (closed) return;` puis `closed = true;` et `wire.add("BYE")`. Dans `send`, vérifie `closed` en premier. Redéclare `close()` **sans** `throws Exception` : une fermeture qui ne peut pas échouer n'a pas à forcer ses clients à attraper quoi que ce soit.
