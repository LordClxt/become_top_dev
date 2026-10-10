## Contexte

Un blog veut suggérer des articles similaires. Pour cela, il compare les tags de deux articles. Les listes de tags viennent de saisies humaines : elles peuvent contenir des doublons.

## Ta mission

Dans `tags.go`, implémente :

```go
func CommonTags(a, b []string) []string
```

Elle renvoie les tags présents dans **les deux** listes :
- sans doublon ;
- triés par ordre alphabétique ;
- une slice de longueur 0 s'il n'y en a aucun.

```go
CommonTags([]string{"go", "web", "go", "api"}, []string{"api", "go", "rust"})
// [api go]
```

## Contraintes

- Utilise une map comme set : la solution doit rester rapide même avec 100 000 tags (pas de double boucle imbriquée).
- Ne modifie pas `a` ni `b`.
