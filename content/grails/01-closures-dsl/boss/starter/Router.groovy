class Router {

    /**
     * Construit un routeur à partir d'un DSL :
     *
     *   def router = Router.build {
     *       get  '/users',     to: 'user#index', as: 'users'
     *       get  '/users/:id', to: 'user#show',  as: 'userShow'
     *       post '/users',     to: 'user#save'
     *       group('/api') {
     *           get '/ping', to: 'health#ping'
     *           group('/v1') { get '/items/:id', to: 'item#show' }
     *       }
     *   }
     *
     * Verbes : get, post, put, delete. `to:` ('controller#action') est obligatoire ;
     * `as:` donne un nom à la route. `group(prefix) { … }` préfixe les routes de la closure (groupes imbriqués possibles).
     * Un `to:` absent ou mal formé : IllegalArgumentException("route invalide : <verbe> <chemin>").
     */
    static Router build(Closure spec) {
        throw new UnsupportedOperationException('à écrire')
    }

    /**
     * Cherche la PREMIÈRE route déclarée qui correspond.
     * - le verbe est insensible à la casse ('get' == 'GET') ;
     * - `:nom` dans un chemin capture un segment non vide (sans '/') ;
     * - un '/' final est ignoré ('/users/' == '/users').
     * Renvoie [controller: 'user', action: 'show', params: [id: '42']] ou null si rien ne correspond.
     */
    Map match(String verb, String path) {
        throw new UnsupportedOperationException('à écrire')
    }

    /**
     * Génère le chemin d'une route nommée : path('userShow', [id: 7]) == '/users/7'.
     * Nom inconnu ou paramètre manquant : IllegalArgumentException.
     */
    String path(String name, Map params = [:]) {
        throw new UnsupportedOperationException('à écrire')
    }
}
