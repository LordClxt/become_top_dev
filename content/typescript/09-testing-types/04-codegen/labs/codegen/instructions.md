## Contexte

Plutôt que de calculer des types à partir d'une description de tables avec des génériques compliqués, tu écris un **générateur** : il produit le code source TypeScript des interfaces, et une fonction vérifie (comme une CI) que le fichier commité est à jour.

Tu édites `codegen.ts`.

## À faire

1. `tsTypeOf(column)` : `'text' | 'uuid'` → `string`, `'int' | 'float'` → `number`, `'bool'` → `boolean`, `'timestamptz'` → `Date`, `'json'` → `unknown`, `{ enum: [...] }` → union de littéraux (`'admin' | 'user'`, guillemets simples), `{ array: col }` → `T[]` (avec parenthèses si `T` est une union : `('a' | 'b')[]`).
2. `toPascalCase(name)` : `'blog_posts'` → `'BlogPosts'`.
3. `generateInterface(table)` : le code source exact (voir les tests) : en-tête TSDoc avec la description de la table si elle existe, une ligne par colonne (`?` si `nullable`), une propriété par ligne indentée de deux espaces.
4. `generateFile(tables)` : l'en-tête `// Fichier généré : ne pas modifier.` puis les interfaces triées par nom, séparées par une ligne vide.
5. `isUpToDate(committed, tables)` : `true` si le fichier commité est identique à ce que produirait `generateFile`.

## Contraintes

Pas de `any`.
