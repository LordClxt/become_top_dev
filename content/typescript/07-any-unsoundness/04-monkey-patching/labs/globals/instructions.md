## Contexte

Un module de session accroche des données à `globalThis` et aux objets d'interface à coups de `as any`. Tu types la globale par une **augmentation**, puis tu remplaces le monkey patching des objets par une `WeakMap`.

Tu édites `session.ts`.

## À faire

1. Augmente le type global : `declare global { var currentUser: User | undefined; }`. Écris `login(user)`, `logout()` et `whoAmI()` (`"Ada"` ou `"anonyme"`) sans aucun `as any`.
2. `setTooltip(target, text)` et `getTooltip(target)` : associent un texte à un objet **sans le modifier** (`WeakMap`) ; `getTooltip` renvoie `string | undefined`.
3. `tooltipCount(targets)` : combien d'objets de la liste ont une infobulle.

## Contraintes

Aucun `any`. Les objets passés à `setTooltip` ne reçoivent aucune propriété.
