## Contexte

Les descriptions de tickets de Helpdesk sont stockées sous forme d'arbre de nœuds (`Fragment.groovy`, `Text.groovy`, `Code.groovy`, `Bold.groovy`, `Link.groovy` et `ExternalLink.groovy`, fournis, à ne pas modifier) : du texte, du gras, du code, des liens internes et externes. Il faut les rendre en HTML. La version actuelle est une longue chaîne de `if (n instanceof …)` que plus personne n'ose toucher. Réécris `Html.groovy` avec **une surcharge de `render` par type de nœud**, et laisse Groovy choisir.

## Rendu attendu

| Nœud | HTML |
|---|---|
| `Text('a < b')` | `a &lt; b` |
| `Code('x && y')` | `<code>x &amp;&amp; y</code>` |
| `Bold([…])` | `<strong>…</strong>` |
| `Link('/t/1', […])` | `<a href="/t/1">…</a>` |
| `ExternalLink('https://x.io', […])` | `<a href="https://x.io" rel="noopener" target="_blank">…</a>` |
| une `List` de nœuds | les rendus mis bout à bout |

- Échappe `&`, `<`, `>` et `"` dans le texte, le code et les attributs.
- Un enfant `null` est ignoré (ni `null` affiché, ni exception).
- Un type de nœud **inconnu** lève `IllegalArgumentException` avec le nom de sa classe : `nœud non géré : Image`.

## Contraintes

- `render` reçoit des nœuds rangés dans des `List<Fragment>` : leur type déclaré est `Fragment`. C'est le dispatch de Groovy qui doit choisir la bonne surcharge.
- Pas d'`instanceof`, pas de `switch` sur la classe.
