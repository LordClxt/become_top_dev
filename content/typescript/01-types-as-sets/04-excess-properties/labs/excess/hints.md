## Hint 1
Une propriété optionnelle s'écrit `darkMode?: boolean`. Tu n'as rien de spécial à faire pour obtenir le contrôle des fautes de frappe : c'est TypeScript qui l'applique aux littéraux.

## Hint 2
Dans `createWindow`, `options.darkMode ?? false` donne la valeur par défaut. Pour `describeChart`, construis un tableau des noms actifs puis `join('+')`.

## Hint 3
Une signature d'index s'écrit `[extra: string]: unknown;` dans l'interface. Attention : `title: string` doit rester compatible avec elle, d'où `unknown` (et non `number`, par exemple).
