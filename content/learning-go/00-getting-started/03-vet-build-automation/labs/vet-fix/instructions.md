## Contexte

Un collègue a écrit les messages d'un petit outil de build. Le code **compile**, mais la CI refuse la branche : `go test` lance automatiquement une partie de `go vet` avant les tests, et vet a trouvé quatre appels à `fmt` incorrects.

## Ta mission

Dans `report.go`, corrige les quatre fonctions pour qu'elles produisent exactement :

```
Summary("relay", 3)  → "relay : 3 fichiers"
Duration(120)        → "durée : 120 ms"
Status(true)         → "statut : ok"
Status(false)        → "statut : échec"
Percent(3, 4)        → "75%"
```

Lance d'abord les tests sans rien toucher et **lis les messages de vet** : ils donnent la ligne et la nature de chaque bug.

## Contraintes

- Garde `fmt.Sprintf` ou `fmt.Sprint` : le but est de comprendre les verbes de format, pas de les contourner avec `+` et `strconv`.
- Ne modifie pas les signatures.
