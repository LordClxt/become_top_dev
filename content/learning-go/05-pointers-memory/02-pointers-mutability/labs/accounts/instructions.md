## Contexte

Tu modélises les comptes d'une petite banque pour Relay. Le choix entre **valeur** et **pointeur** dans chaque signature n'est pas anodin : il dit à l'appelant si la fonction va modifier son compte.

## Ta mission

Dans `accounts.go`, implémente :

### `Open(owner string, initial int) (Account, error)`
Crée un compte et le renvoie **par valeur** (pas de pointeur : l'appelant décide). Erreurs : `ErrOwner` si le propriétaire est vide, `ErrAmount` si le solde initial est négatif. Zéro est un solde initial valide.

### `Deposit(a *Account, amount int) error`
Ajoute au solde de `a`. Le compte de l'appelant **est modifié**. Erreurs : `ErrNilAccount` (pointeur nil), `ErrAmount` (montant ≤ 0).

### `Withdraw(a *Account, amount int) error`
Retire du solde. Mêmes erreurs, plus `ErrInsufficient` quand `amount` dépasse le solde (retirer exactement le solde est permis).

### `Transfer(from, to *Account, amount int) error`
Déplace `amount` de `from` vers `to`. Vérifications **dans cet ordre** : un compte nil (`ErrNilAccount`), le même compte des deux côtés (`ErrSameAccount`), un montant ≤ 0 (`ErrAmount`), un solde insuffisant (`ErrInsufficient`). **En cas d'erreur, aucun des deux comptes n'est modifié.**

> Pour détecter « le même compte », compare les **pointeurs**, pas les contenus : deux comptes distincts peuvent avoir les mêmes valeurs.

### `Ensure(a *Account) *Account`
Renvoie `a`, ou un **nouveau** compte vide s'il est `nil`. Une fonction ne peut pas rendre non nil le pointeur de l'appelant : elle doit renvoyer le résultat, que l'appelant réaffecte (`acc = Ensure(acc)`).

### `Snapshot(a *Account) (Account, bool)`
Une copie de `a` ; `false` si `a` est `nil`. La copie ne suit pas les modifications ultérieures de l'original.

## Contrainte

Chaque fonction qui accepte un pointeur doit se protéger d'un `nil` sans paniquer.
