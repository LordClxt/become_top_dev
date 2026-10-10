## Contexte

Les services de Relay écrivent des journaux textuels. Avant de brancher un vrai outil de supervision, on veut un résumé rapide : combien de lignes par niveau, quelles sources ont des erreurs, combien de lignes illisibles. Tu écris l'analyseur, et tu utilises le bon outil de contrôle de flux à chaque étape.

## Ta mission

Dans `logs.go`, implémente :

```go
func Analyze(log string) Report
```

### Format

Une ligne par entrée : `NIVEAU SOURCE message libre…`, par exemple `ERROR db timeout after 30s`.

### Règles

1. Découpe le journal sur les retours à la ligne et retire les espaces en bordure de chaque ligne (y compris `\r`).
2. Une ligne **vide** ou qui commence par `#` est ignorée : elle ne compte nulle part.
3. Une ligne qui vaut exactement `--END--` **arrête** l'analyse : `Truncated` vaut `true` et tout ce qui suit est ignoré, même s'il y a des erreurs.
4. Toute autre ligne compte dans `Lines`. Elle est **mal formée** (`Malformed++`) si elle a moins de deux champs, ou si son niveau est inconnu. Les niveaux sont sensibles à la casse.
5. Niveaux reconnus : `DEBUG`, `INFO`, `WARN`, `WARNING` (compté comme `WARN`), `ERROR`, `FATAL` (compté comme `ERROR`).
6. `Counts` contient, pour chaque niveau canonique vu (`DEBUG`, `INFO`, `WARN`, `ERROR`), son nombre de lignes. Il n'est jamais `nil`.
7. `ErrorSources` liste les sources, **sans doublon et triées**, qui ont au moins une ligne `ERROR` ou `FATAL`.

Le message libre peut contenir n'importe quoi, même un mot qui ressemble à un niveau.

## Pièges à anticiper

- L'ordre de parcours d'une map est aléatoire : trie ce qui sort de ta fonction.
- Un `break` dans un `case` ne quitte que le `switch` ; il te faut un label (ou un `return`) pour arrêter la boucle sur `--END--`.
- `continue` est ton ami pour ignorer les lignes sans imbriquer les `if`.
