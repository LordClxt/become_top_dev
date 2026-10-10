---
id: go-ch00-l02
title: "go fmt et la règle des points-virgules"
source: { chapter: 1, pages: "29-30" }
duration_min: 15
concepts:
  - id: go-fmt-standard
    label: "Un format unique imposé par go fmt"
  - id: go-semicolon-insertion
    label: "La règle d'insertion des points-virgules"
glossary:
  - term: "gofmt / go fmt"
    definition: "Outil qui réécrit le code au format standard de Go : tabulations, espaces, alignements."
  - term: "lexer"
    definition: "Première étape du compilateur : découpe le texte source en tokens (mots-clés, identifiants, littéraux, opérateurs)."
  - term: "token"
    definition: "Plus petite unité de sens du code : func, main, (, 42, \"texte\"…"
  - term: "./..."
    definition: "Motif qui désigne le package courant et tous ses sous-dossiers."
visuals: [go-ch00-semicolon-insertion]
labs: [go-ch00-l02-lab-semicolons]
xp: 25
---

## Pourquoi c'est important

Dans la plupart des langages, chaque équipe débat de son style : tabulations ou espaces, accolade sur la même ligne ou la suivante. Go a tranché pour tout le monde. Résultat : tout code Go se ressemble, les revues parlent du fond, et les outils peuvent réécrire du code sans casser la mise en forme.

## Un seul format : `go fmt`

```bash
go fmt ./...
```

La commande reformate tous les fichiers du module (`./...` = ce dossier et tous ses sous-dossiers). Elle impose notamment :

- des **tabulations** pour l'indentation ;
- l'alignement des commentaires et des champs de struct ;
- les espaces autour des opérateurs, selon la priorité.

Selon Russ Cox, qui a dirigé le développement de Go, le but premier était l'**outillage** : un format unique rend simple l'écriture d'outils qui lisent et génèrent du code. La fin des débats de style est un bonus.

> **Habitude pro.** Configure ton éditeur pour formater à la sauvegarde (gopls le fait). Si tu dois reformater un vieux projet, fais-le dans un commit séparé, sans aucun changement de logique : sinon les vraies modifications sont noyées dans le bruit.

## La règle d'insertion des points-virgules

Go a besoin d'un point-virgule à la fin de chaque instruction, comme C ou Java. Mais **on ne les écrit jamais** : le lexer les ajoute en fin de ligne. Il insère un `;` si le dernier token de la ligne est :

- un **identifiant** (`x`, `main`, `int`, `float64`…) ;
- un **littéral** : nombre, string, rune (`42`, `"ok"`, `'a'`) ;
- l'un des mots-clés `break`, `continue`, `fallthrough`, `return` ;
- l'un des tokens `++`, `--`, `)`, `]`, `}`.

Sinon, la ligne continue sur la suivante. Essaie avec le visuel ci-dessous.

::visual{id="go-ch00-semicolon-insertion"}

### Pourquoi l'accolade reste sur la même ligne

```go
func main()
{
	fmt.Println("Bonjour")
}
```

La première ligne se termine par `)`, donc le lexer insère un point-virgule : le compilateur lit `func main();`, une déclaration sans corps. Il répond `syntax error: unexpected semicolon or newline before {`. `go fmt` ne peut pas réparer ça : le code n'est même pas analysable.

### Pourquoi la virgule finale est obligatoire

> **Au-delà du livre.** La même règle explique une autre habitude de Go :

```go
ports := []int{
	8080,
	8443, // virgule obligatoire
}
```

Sans la virgule après `8443`, la ligne finit par un littéral : un `;` est inséré au milieu de la liste, et la compilation échoue. Bonus : ajouter un élément ne modifie qu'une ligne dans le diff.

## Pièges fréquents

- Mettre l'accolade ouvrante à la ligne : erreur de syntaxe, pas un problème de style.
- Couper une longue expression **après** un opérande : `total := a` puis `+ b` à la ligne suivante. Le `;` est inséré après `a`. Coupe **après l'opérateur** : `total := a +`.
- Oublier la virgule finale dans un littéral sur plusieurs lignes.
- Committer du code non formaté : la CI de la plupart des projets Go refuse ce qui n'est pas passé par `gofmt`.

## À retenir

- `go fmt ./...` impose le format standard : on ne discute plus de style.
- Le lexer insère un `;` après un identifiant, un littéral, `break`/`continue`/`fallthrough`/`return`, ou `++ -- ) ] }` en fin de ligne.
- D'où : accolade ouvrante sur la même ligne, virgule finale dans les listes sur plusieurs lignes, coupure après l'opérateur.
