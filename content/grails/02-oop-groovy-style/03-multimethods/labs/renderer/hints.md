## Hint 1
Écris `static String render(Text t)`, `render(Code c)`, `render(Bold b)`… et une surcharge `render(Fragment f)` pour le cas inconnu. Comme les enfants sont rangés dans des `List<Fragment>`, seul le type **réel** peut départager : c'est le travail des multiméthodes.

## Hint 2
Un `ExternalLink` est aussi un `Link` : si tu écris `render(ExternalLink)`, c'est elle qui gagne (la plus proche). Pour les enfants, `render(List nodes)` qui filtre les `null` (`findAll { it != null }`) puis concatène les rendus de chacun.

## Hint 3
Ne laisse pas `null` arriver à `render` : Groovy choisirait une surcharge sans prévenir. Un petit `escape(String)` qui remplace `&` en premier, puis `<`, `>` et `"`, sert à tous les nœuds.
