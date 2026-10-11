## Contexte

C'est le point d'orgue du chapitre : le langage qui est la **fondation** de Cypher et de SPARQL. Tu écris son moteur : un évaluateur Datalog qui applique des règles jusqu'au **point fixe**, et qui répond à des requêtes par motif. Il doit faire tourner l'exemple du livre : retrouver Lucy, née aux États-Unis et vivant en Europe, grâce à une règle récursive.

## Modèle

- Un **atome** `Atom{Pred, Args}` s'écrit `pred(a, b)`. Un argument qui commence par une **majuscule** est une **variable** ; sinon c'est une **constante**. Les faits n'ont pas de variable.
- Une **règle** `Rule{Head, Body}` dit : *Head est vrai si tous les atomes de Body sont vrais*.

## À implémenter dans `datalog.go`

### `Eval(facts, rules) []Atom`
Applique les règles aux faits **jusqu'à ce qu'aucun fait nouveau n'apparaisse** (point fixe). Renvoie tous les faits (départ + dérivés), **sans doublon**, **triés** par `String()`.
- Le corps d'une règle se résout atome par atome, de gauche à droite, en gardant les liaisons de variables ; une variable déjà liée doit retrouver la même valeur.
- Les règles **non sûres** (une variable de la tête absente du corps) sont ignorées.
- Les faits et règles de l'appelant ne sont pas modifiés. Il faut terminer sur un graphe à **cycle**.

### `Query(db, pattern) []map[string]string`
Pour chaque fait de `db` qui correspond au motif, renvoie les liaisons des variables. Une variable répétée (`p(X, X)`) doit recevoir la même valeur. Résultats sans doublon, dans l'ordre des faits triés par `String()`. Un motif sans variable qui correspond donne une association vide ; sans correspondance : slice vide non nil.

## Aide fournie

`Atom.String()`, `isVar` et les types sont déjà écrits.
