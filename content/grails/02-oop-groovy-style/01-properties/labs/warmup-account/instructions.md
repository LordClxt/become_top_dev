## Contexte

Un compte utilisateur, comme ceux d'un domaine Grails. Le support se plaint de trois choses : deux comptes existent pour `Ana@Mail.io` et `ana@mail.io`, un script a modifié l'identifiant d'un compte, et chaque écran recalcule le nom affiché à sa façon. Tu corriges la classe `Account` (fichier `Account.groovy`).

## À faire

1. **`email` normalisé** : toute affectation (`new Account(email: …)` ou `account.email = …`) enlève les espaces autour et passe en minuscules. `null` reste `null`.
2. **`id` en lecture seule** : chaque compte reçoit un identifiant `acc-` suivi de 8 caractères (par exemple les 8 premiers d'un `UUID`). Personne ne peut le modifier : `account.id = 'x'` doit lever `ReadOnlyPropertyException`.
3. **`displayName` calculé** : `"Ana Lovelace <ana@mail.io>"` à partir de `name` et `email`, ou seulement `name` si l'email est `null`. Ce n'est pas un champ : il suit toujours les valeurs actuelles.
4. **`locked`** reste un booléen ordinaire ; vérifie que `account.isLocked()` fonctionne.

```groovy
def a = new Account(name: 'Ana Lovelace', email: '  Ana@Mail.IO ')
a.email        // 'ana@mail.io'
a.displayName  // 'Ana Lovelace <ana@mail.io>'
a.id = 'x'     // ReadOnlyPropertyException
```

## Contraintes

Pas d'`.@`, pas de méthode `normalize()` à appeler à la main : le comportement doit venir des propriétés elles-mêmes.
