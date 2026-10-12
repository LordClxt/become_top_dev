## Contexte

Grails manipule beaucoup de texte : URLs propres, numéros de version, montants lus dans des formulaires. Tu écris cinq petites fonctions utilitaires de **Minigrails** dans `Text.groovy`.

## 1. `slug(String title)`

Transforme un titre en fragment d'URL : minuscules, tout bloc de caractères qui n'est pas `a-z` ou `0-9` devient un seul `-`, sans `-` au début ni à la fin.

```groovy
Text.slug('Hello, World! 2024')      // 'hello-world-2024'
Text.slug('  --Grails 7 rocks-- ')   // 'grails-7-rocks'
```

## 2. `versions(String text)`

Trouve tous les numéros `majeur.mineur` ou `majeur.mineur.patch` du texte et renvoie une liste de maps `[major:, minor:, patch:]` d'**entiers**. Le patch absent vaut `0`.

```groovy
Text.versions('Grails 7.0 et Groovy 4.0.33')
// [[major:7, minor:0, patch:0], [major:4, minor:0, patch:33]]
```

## 3. `greeting(Map ctx)`

Renvoie un `GString` `Hello <name>` qui lit `ctx.name` **au moment où on le convertit en String**, pas à la création. Si `ctx.name` change entre-temps, le texte suit.

## 4. `total(List<String> amounts)`

Additionne des montants écrits en texte (`['0.1', '0.2']`) et renvoie un `BigDecimal` exact : `0.3`, pas `0.30000000000000004`. Liste vide : `0`.

## 5. `isHexColor(String s)`

Vrai si **toute** la chaîne est une couleur `#rrggbb` (six chiffres hexadécimaux). `'#00ff7F'` oui ; `'#00ff7'` et `'xx#00ff7Fxx'` non.
