## Hint 1
Écris `const alice: Person = { name: 'Alice', age: 30 }` : l'annotation te force à fournir `age`. Pour le `map`, annote le retour de la flèche : `(name): Person => ({ name, age })`.

## Hint 2
Remplace `String` par `string`. Pour `isPerson`, commence par `typeof value === 'object' && value !== null`, puis lis les propriétés comme `unknown` avant de tester leur `typeof`.

## Hint 3
Lire `value.name` sur un `unknown` est interdit. Une fois que tu sais que c'est un objet non nul, `(value as Record<string, unknown>).name` est une assertion sûre, parce que tu viens de le vérifier. `parsePerson` : `const value: unknown = JSON.parse(json); return isPerson(value) ? value : null;`.
