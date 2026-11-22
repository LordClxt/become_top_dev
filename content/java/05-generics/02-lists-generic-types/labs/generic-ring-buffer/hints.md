## Hint 1
D'où vient la `ClassCastException` ? `(E[]) new Object[size]` crée un `Object[]`. Tant qu'il reste dans la classe, personne ne le remarque ; dès qu'il sort, le cast que javac a inséré chez l'appelant (vers `String[]`) échoue.

## Hint 2
Ne fais plus sortir de tableau : `snapshot()` construit une `ArrayList<E>`. Et pour le stockage interne, garde un `Object[]` honnête, avec un cast `(E)` à la lecture.

## Hint 3
Une méthode privée `E at(int i)` avec `@SuppressWarnings("unchecked") E e = (E) elements[...]; return e;` et un commentaire (« seul push écrit dans le tableau, et il ne reçoit que des E »). Au passage, `poll()` peut mettre la case à `null` : le tampon ne retient plus l'élément retiré (module 1, références obsolètes).
