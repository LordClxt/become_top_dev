---
id: go-ch04-l04
title: "defer : nettoyer quoi qu'il arrive"
source: { chapter: 5, pages: "133-138" }
duration_min: 25
concepts:
  - id: go-defer-basics
    label: "defer différé jusqu'à la sortie de la fonction, en ordre inverse (LIFO)"
  - id: go-defer-args
    label: "Les arguments d'un defer sont évalués immédiatement"
  - id: go-defer-named-return
    label: "Un defer peut lire et modifier les retours nommés"
  - id: go-closer-pattern
    label: "Le motif « ressource + fonction de nettoyage »"
glossary:
  - term: "defer"
    definition: "Mot-clé qui repousse l'exécution d'un appel de fonction jusqu'à la sortie de la fonction englobante, quelle que soit la manière dont elle sort."
  - term: "LIFO"
    definition: "Last In, First Out : le dernier defer enregistré est le premier exécuté, comme une pile d'assiettes."
  - term: "ressource"
    definition: "Ce qu'il faut libérer après usage : fichier, connexion réseau, verrou, transaction."
  - term: "transaction"
    definition: "Suite d'opérations de base de données qui réussissent toutes (commit) ou sont toutes annulées (rollback)."
visuals: [go-ch04-defer-timeline]
labs: [go-ch04-l04-lab-defers]
xp: 30
---

## Pourquoi c'est important

Un programme ouvre des fichiers, des connexions, des transactions, des verrous. Chacun doit être libéré, **quel que soit le chemin de sortie** de la fonction : fin normale, `return` anticipé sur une erreur, panique. Oublier une seule libération sur un seul chemin, c'est une fuite de ressource. Go résout ce problème avec `defer`, qui attache le nettoyage à l'endroit même où l'on acquiert la ressource.

## `defer` en action

```go
func main() {
	if len(os.Args) < 2 {
		log.Fatal("aucun fichier indiqué")
	}
	f, err := os.Open(os.Args[1])
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()          // sera exécuté à la sortie de main, quoi qu'il arrive

	data := make([]byte, 2048)
	for {
		count, err := f.Read(data)
		os.Stdout.Write(data[:count])
		if err != nil {
			if err != io.EOF {
				log.Fatal(err)
			}
			break
		}
	}
}
```

Un appel de fonction normal s'exécute tout de suite ; avec `defer`, il est **mémorisé** et ne s'exécute que lorsque la fonction se termine. Tu peux différer une fonction, une méthode ou une closure. Le `defer` se place juste après l'acquisition : tout ce qui suit, y compris les `return` anticipés, bénéficiera du nettoyage.

### Plusieurs `defer` : dernier arrivé, premier servi

Les appels différés s'exécutent dans l'ordre **inverse** de leur enregistrement (LIFO). C'est logique : on ferme d'abord ce qu'on a ouvert en dernier.

### Les arguments sont évalués tout de suite

Quand tu écris `defer f(x)`, la valeur de `x` est **fixée à ce moment-là**, pas à l'exécution différée :

```go
func deferExample() int {
	a := 10
	defer func(val int) {
		fmt.Println("premier :", val)
	}(a)                        // val = 10, figé ici
	a = 20
	defer func(val int) {
		fmt.Println("second :", val)
	}(a)                        // val = 20
	a = 30
	fmt.Println("sortie :", a)
	return a
}
// sortie : 30
// second : 20
// premier : 10
```

Le code différé s'exécute **après** le `return`, dans l'ordre inverse, avec les valeurs capturées au moment du `defer`.

::visual{id="go-ch04-defer-timeline"}

> **Piège classique.** Oublier les parenthèses d'une closure différée : `defer func() { … }` ne compile pas. Les parenthèses servent à passer les arguments, même quand il n'y en a pas : `defer func() { … }()`.

Si la fonction différée renvoie des valeurs, elles sont simplement perdues : on ne peut pas les lire.

## Lire et modifier le résultat : les retours nommés

Un `defer` peut **examiner et changer les valeurs de retour** de la fonction, à condition qu'elles soient nommées. C'est la meilleure raison d'utiliser des retours nommés. Exemple type : une transaction.

```go
func DoSomeInserts(ctx context.Context, db *sql.DB, value1, value2 string) (err error) {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		if err == nil {
			err = tx.Commit()      // peut échouer : on remplace err
		}
		if err != nil {
			tx.Rollback()
		}
	}()
	_, err = tx.ExecContext(ctx, "INSERT INTO foo (val) VALUES ($1)", value1)
	if err != nil {
		return err
	}
	// … d'autres insertions
	return nil
}
```

Le `defer` fait tout le travail de fin : s'il n'y a pas d'erreur, il valide ; si l'une des étapes a échoué, ou si la validation elle-même échoue, il annule. Le corps de la fonction se contente de `return err` à chaque échec. Sans retour nommé, le `defer` ne pourrait pas modifier la valeur renvoyée.

> **Sans retour nommé :** `return n` copie `n` dans la valeur de retour *avant* l'exécution des `defer`. Modifier `n` ensuite ne change rien à ce qui est renvoyé.

## Motif : renvoyer le nettoyage avec la ressource

Une fonction qui acquiert une ressource peut aussi renvoyer **la fonction qui la libère** :

```go
func getFile(name string) (*os.File, func(), error) {
	file, err := os.Open(name)
	if err != nil {
		return nil, nil, err
	}
	return file, func() { file.Close() }, nil
}

f, closer, err := getFile(os.Args[1])
if err != nil {
	log.Fatal(err)
}
defer closer()
```

Comme Go interdit les variables inutilisées, l'appelant **ne peut pas oublier** d'utiliser `closer` : le code ne compile pas tant qu'il ne le fait pas. C'est une façon élégante de rappeler à l'appelant qu'il y a quelque chose à libérer.

### Pourquoi pas des blocs `try/finally` ?

Les langages à blocs (`try/finally`, `begin/ensure`) ajoutent un niveau d'indentation par ressource. Une étude sur la complexité du code a identifié l'**imbrication** comme l'un des facteurs qui la font croître le plus. Avec `defer`, le nettoyage reste à plat, juste sous l'acquisition.

## Pièges fréquents

- **`defer` dans une boucle** : les appels s'accumulent jusqu'à la fin de la **fonction**, pas de l'itération. Pour libérer à chaque tour, extrais le corps dans une fonction.
- **Évaluation immédiate des arguments** : `defer fmt.Println(x)` affiche la valeur de `x` à l'instant du `defer`.
- **Oublier de vérifier l'erreur avant le `defer`** : fais `defer f.Close()` seulement une fois `err == nil`, sinon `f` peut être `nil`.
- **`:=` qui masque le retour nommé** dans le corps : le `defer` modifie le bon `err`, mais le corps en remplit un autre.

## À retenir

- `defer` repousse un appel à la sortie de la fonction : fin normale, `return` anticipé ou panique.
- Plusieurs `defer` s'exécutent en ordre inverse ; leurs arguments sont évalués à l'enregistrement.
- Avec des retours nommés, un `defer` peut lire et modifier le résultat, par exemple pour valider ou annuler une transaction.
- Renvoyer une fonction de nettoyage avec la ressource force l'appelant à penser à la libérer.
