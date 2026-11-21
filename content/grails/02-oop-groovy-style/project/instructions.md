## Contexte

Dans Grails 7, `class BookController { def show(Long id) { render json: … } }` n'hérite de rien. `render`, `redirect` et `params` viennent du **trait** `grails.artefact.Controller`, ajouté à la compilation (leçon 4). Les actions sont les méthodes publiques que **tu** as écrites ; `/book/show/3` appelle `show(3L)` parce que Grails lit le nom et le type du paramètre.

Tu construis tout ça pour **Minigrails**. `Response.groovy` est fourni ; tu écris `Controller.groovy` et `Minigrails.groovy`.

## Jalon 1 : le trait `Controller`

État : `Map params = [:]` et `Response response = new Response()`.

**`String getControllerName()`** : `BookController` → `book`, `HelpDeskTicketController` → `helpDeskTicket`. Propriété calculée, pas stockée.

**`render(Map opts)`** : clés admises `text`, `json`, `view`, `model`, `status`, `contentType`.

| Appel | Effet sur `response` |
|---|---|
| `render text: 'ok'` | `body = 'ok'`, `contentType = 'text/plain'` |
| `render json: [id: 3]` | `body = '{"id":3}'` (`groovy.json.JsonOutput`), `contentType = 'application/json'` |
| `render view: 'show', model: [b: 1]` | `view = 'book/show'` (préfixé par `controllerName`, sauf si la vue commence par `/`), `model = [b: 1]` |
| `render status: 204` | seulement le statut |

- `status` vaut 200 par défaut et peut arriver en texte (`status: '422'`).
- `contentType` remplace le type par défaut.
- Au plus **une** clé parmi `text` / `json` / `view`, sinon `IllegalArgumentException`.
- Une clé inconnue → `IllegalArgumentException` qui la cite. `render txt: 'x'` ne doit pas passer en silence.

**`redirect(Map opts)`** : clés `action`, `controller` (défaut : le contrôleur courant), `id`, ou bien `uri` seul. Le statut vaut 302 et `redirectUrl` reçoit `/controller/action` ou `/controller/action/id`, ou l'`uri`. Sans `action` ni `uri` → `IllegalArgumentException`.

**Une seule réponse** : après un `render` ou un `redirect`, `response.committed` vaut vrai. Une seconde tentative lève `IllegalStateException`. C'est la vraie erreur de Grails quand une action fait `render` puis `redirect`.

## Jalon 2 : `Minigrails.register(Class... types)`

- Une classe doit **se terminer par `Controller`** et **implémenter `Controller`**, sinon `IllegalArgumentException`. Deux classes du même nom de contrôleur, même erreur.
- `controllerNames` : les noms enregistrés, triés.
- `actions(String controller)` : les noms d'actions, triés. Une action est une méthode **déclarée dans la classe**, publique, non statique, et écrite par le développeur. Le compilateur ajoute aussi des méthodes à ta classe : les accesseurs des propriétés, les méthodes du trait, des méthodes synthétiques. Toutes portent une trace que tu peux lire par réflexion. Écris un petit script qui affiche `declaredMethods` avec `synthetic` et `annotations` : la règle saute aux yeux.

## Jalon 3 : `Response handle(String uri, Map query = [:])`

- `/controller/action?/id?`. Sans action, on prend `static defaultAction` de la classe, ou `index` par défaut.
- Contrôleur ou action inconnus → `Response` de statut 404.
- **Une nouvelle instance par requête**. `params` = `query` + `id` s'il est dans l'URI. (Grails 7 utilise un singleton et lie `params` à la requête en cours ; même effet, mécanisme différent.)
- **Liaison des paramètres** : chaque paramètre de l'action est pris dans `params` **par son nom**, converti vers `String`, `Long`, `Integer` ou `Boolean`. Une valeur absente ou non convertible donne `null`, comme dans Grails, qui ne lève pas d'exception mais laisse le paramètre vide.
- **Convention de vue** : si l'action n'a rien envoyé, la réponse prend `view = 'controller/action'` et, pour modèle, la `Map` renvoyée par l'action (`[:]` sinon).

💡 Les noms des paramètres ne sont dans le bytecode que si le compilateur les y met. C'est le rôle de `-pa` (`--parameters`) dans la commande de test. Sans cette option, `show(Long id)` a un paramètre nommé `arg0`. Grails n'en dépend pas : sa transformation AST lit les noms dans le code source, à la compilation.
