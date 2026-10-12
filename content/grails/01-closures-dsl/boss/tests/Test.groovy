def router = Router.build {
    get    '/users',     to: 'user#index', as: 'users'
    get    '/users/:id', to: 'user#show',  as: 'userShow'
    post   '/users',     to: 'user#save'
    put    '/users/:id', to: 'user#update'
    delete '/users/:id', to: 'user#delete'
    get    '/users/me',  to: 'user#me'
    group('/api') {
        get '/ping', to: 'health#ping'
        group('/v1') {
            get '/items/:id',            to: 'item#show', as: 'item'
            get '/items/:id/tags/:tag',  to: 'item#tag'
        }
    }
}

Spec.test('match : route simple') {
    assert router.match('GET', '/users') == [controller: 'user', action: 'index', params: [:]]
}

Spec.test('match : capture un segment') {
    assert router.match('GET', '/users/42') == [controller: 'user', action: 'show', params: [id: '42']]
}

Spec.test('match : le verbe fait partie de la route et se compare sans casse') {
    assert router.match('post', '/users').action == 'save'
    assert router.match('Put', '/users/7').action == 'update'
    assert router.match('DELETE', '/users/7').action == 'delete'
}

Spec.test('match : un verbe sans route donne null') {
    assert router.match('PATCH', '/users/1') == null
    assert router.match('DELETE', '/users') == null
}

Spec.test('match : un chemin inconnu donne null') {
    assert router.match('GET', '/nope') == null
    assert router.match('GET', '/users/1/extra') == null
}

Spec.test('match : un « / » final est ignoré') {
    assert router.match('GET', '/users/') == [controller: 'user', action: 'index', params: [:]]
}

Spec.test('match : la première route déclarée l\'emporte') {
    // /users/me est déclarée après /users/:id : « me » est donc capturé comme un id
    assert router.match('GET', '/users/me') == [controller: 'user', action: 'show', params: [id: 'me']]
}

Spec.test('group : préfixe les routes, et les groupes s\'imbriquent') {
    assert router.match('GET', '/api/ping').controller == 'health'
    assert router.match('GET', '/ping') == null
    assert router.match('GET', '/api/v1/items/7') == [controller: 'item', action: 'show', params: [id: '7']]
}

Spec.test('match : plusieurs captures') {
    assert router.match('GET', '/api/v1/items/7/tags/rouge').params == [id: '7', tag: 'rouge']
}

Spec.test('path : génère le chemin d\'une route nommée') {
    assert router.path('users') == '/users'
    assert router.path('userShow', [id: 7]) == '/users/7'
    assert router.path('item', [id: 'abc']) == '/api/v1/items/abc'
}

Spec.test('path : nom inconnu ou paramètre manquant') {
    try { router.path('inconnue'); assert false, 'IllegalArgumentException attendue' } catch (IllegalArgumentException e) { }
    try { router.path('userShow'); assert false, 'IllegalArgumentException attendue' } catch (IllegalArgumentException e) { }
}

Spec.test('build : to: manquant ou mal formé est refusé') {
    ['get \'/a\'', 'get \'/a\', to: \'sans-diese\'', 'get \'/a\', to: \'#action\'', 'get \'/a\', to: \'a#\''].each { String line ->
        try {
            Router.build(new GroovyShell().evaluate("{ -> $line }") as Closure)
            assert false, "route invalide acceptée : $line"
        } catch (IllegalArgumentException e) {
            assert e.message == 'route invalide : get /a'
        }
    }
}

Spec.test('build : un verbe inconnu n\'est pas une route') {
    try {
        Router.build { patch '/a', to: 'a#b' }
        assert false, 'MissingMethodException attendue'
    } catch (MissingMethodException expected) { }
}

Spec.done()
