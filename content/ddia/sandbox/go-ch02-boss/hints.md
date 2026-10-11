## Hint 1
Ne touche pas au disque pendant que tu calcules : lis les pages dans une petite structure (une map « pages modifiées » superposée au disque) et ne produis le `Batch` qu'à la fin.

## Hint 2
L'ordre est tout : `AppendWAL(batch)` d'abord, puis `WritePage` pour chaque page (triées par identifiant), puis `WriteRoot` si la racine a changé, puis `TruncateWAL`. Pour la reprise, c'est la même fonction « appliquer un batch ».

## Hint 3
Réserve les identifiants des nouvelles pages avec `AllocPageID()` pendant la préparation. Une page qui n'éclate pas ne modifie pas son parent : seules les pages réellement changées doivent figurer dans le batch.
