Spec.filter = args ? args[0] : null

class BookController implements Controller {
    String lastTitle
    def index() { render text: 'liste' }
    def show(Long id) { render json: [id: id, title: 'GiA'] }
    def save(String title) {
        if (!title) { render status: 422, text: 'titre requis'; return }
        redirect action: 'show', id: 42
    }
    def edit(Long id) { [id: id] }
    def nothing() { }
    def search(String q, Integer max, Boolean exact) { render text: "$q|$max|$exact" }
    def twice() { render text: 'a'; redirect action: 'index' }
    def peek() { render text: params.keySet().sort().join(',') }
    private secret() { 'caché' }
    static util() { 'statique' }
}

class HelpDeskTicketController implements Controller {
    static defaultAction = 'list'
    def list() { render view: '/shared/tickets', model: [n: 2] }
}

class OtherBookController implements Controller {}
class Book implements Controller {}
class LooseController { def index() {} }

def ctl() { new BookController() }

// ─── M1 ───────────────────────────────────────────────────────────────
Spec.test('M1 · controllerName se déduit du nom de la classe') {
    assert ctl().controllerName == 'book'
    assert new HelpDeskTicketController().controllerName == 'helpDeskTicket'
}

Spec.test('M1 · render text') {
    def c = ctl(); c.render text: 'bonjour'
    assert [c.response.status, c.response.body, c.response.contentType] == [200, 'bonjour', 'text/plain']
    assert c.response.committed
}

Spec.test('M1 · render json') {
    def c = ctl(); c.render json: [id: 3, tags: ['a']]
    assert c.response.body == '{"id":3,"tags":["a"]}'
    assert c.response.contentType == 'application/json'
}

Spec.test('M1 · render view : préfixée par le contrôleur, sauf chemin absolu') {
    def c = ctl(); c.render view: 'show', model: [b: 1]
    assert c.response.view == 'book/show' && c.response.model == [b: 1]
    def d = ctl(); d.render view: '/shared/empty'
    assert d.response.view == '/shared/empty'
}

Spec.test('M1 · status seul, en nombre ou en texte, et contentType') {
    def c = ctl(); c.render status: 204
    assert c.response.status == 204 && c.response.body == null
    def d = ctl(); d.render status: '422', text: 'invalide', contentType: 'text/html'
    assert d.response.status == 422 && d.response.contentType == 'text/html'
}

Spec.test('M1 · clé inconnue : refusée en la citant') {
    try { ctl().render txt: 'x'; assert false, 'render txt: doit être refusé' }
    catch (IllegalArgumentException e) { assert e.message.contains('txt') }
}

Spec.test('M1 · text et json ensemble : refusé') {
    try { ctl().render text: 'a', json: [:]; assert false, 'deux corps de réponse à la fois' }
    catch (IllegalArgumentException e) { }
}

Spec.test('M1 · redirect vers une action, avec ou sans id, ou vers une uri') {
    def a = ctl(); a.redirect action: 'show', id: 7
    assert a.response.status == 302 && a.response.redirectUrl == '/book/show/7'
    def b = ctl(); b.redirect controller: 'ticket', action: 'list'
    assert b.response.redirectUrl == '/ticket/list'
    def c = ctl(); c.redirect uri: '/login'
    assert c.response.redirectUrl == '/login'
}

Spec.test('M1 · redirect sans cible ou avec une clé inconnue : refusé') {
    try { ctl().redirect id: 3; assert false, 'ni action ni uri' } catch (IllegalArgumentException e) { }
    try { ctl().redirect acton: 'show'; assert false, 'acton: est une faute de frappe' }
    catch (IllegalArgumentException e) { assert e.message.contains('acton') }
}

Spec.test('M1 · une seule réponse par action') {
    def c = ctl(); c.render text: 'a'
    try { c.redirect action: 'index'; assert false, 'render puis redirect doit lever IllegalStateException' }
    catch (IllegalStateException e) { }
}

// ─── M2 ───────────────────────────────────────────────────────────────
Spec.test('M2 · register et controllerNames') {
    def app = new Minigrails()
    app.register(HelpDeskTicketController, BookController)
    assert app.controllerNames == ['book', 'helpDeskTicket']
}

Spec.test('M2 · les actions : seulement les méthodes écrites par le développeur') {
    def app = new Minigrails(); app.register(BookController)
    assert app.actions('book') == ['edit', 'index', 'nothing', 'peek', 'save', 'search', 'show', 'twice']
}

Spec.test('M2 · un contrôleur sans action déclarée') {
    def app = new Minigrails(); app.register(OtherBookController)
    assert app.actions('otherBook') == []
}

Spec.test('M2 · nom sans suffixe Controller : refusé') {
    try { new Minigrails().register(Book); assert false, 'Book ne se termine pas par Controller' }
    catch (IllegalArgumentException e) { }
}

Spec.test('M2 · classe qui n\'implémente pas le trait : refusée') {
    try { new Minigrails().register(LooseController); assert false, 'LooseController n\'implémente pas Controller' }
    catch (IllegalArgumentException e) { }
}

Spec.test('M2 · même contrôleur deux fois : refusé') {
    try { new Minigrails().register(BookController, BookController); assert false, 'doublon' }
    catch (IllegalArgumentException e) { }
}

// ─── M3 ───────────────────────────────────────────────────────────────
def app() { def a = new Minigrails(); a.register(BookController, HelpDeskTicketController); a }

Spec.test('M3 · /book/show/3 appelle show(3L)') {
    def r = app().handle('/book/show/3')
    assert r.status == 200 && r.body == '{"id":3,"title":"GiA"}'
}

Spec.test('M3 · action par défaut : index, ou static defaultAction') {
    assert app().handle('/book').body == 'liste'
    assert app().handle('/helpDeskTicket').view == '/shared/tickets'
}

Spec.test('M3 · liaison par nom et par type depuis la query') {
    assert app().handle('/book/search', [q: 'groovy', max: '5', exact: 'true']).body == 'groovy|5|true'
    assert app().handle('/book/search', [max: 'beaucoup']).body == 'null|null|null'
}

Spec.test('M3 · id non convertible : null, pas d\'exception') {
    assert app().handle('/book/show/abc').body == '{"id":null,"title":"GiA"}'
}

Spec.test('M3 · render status, redirect') {
    def a = app()
    assert a.handle('/book/save').status == 422
    def r = a.handle('/book/save', [title: 'GiA'])
    assert r.status == 302 && r.redirectUrl == '/book/show/42'
}

Spec.test('M3 · convention de vue quand l\'action ne rend rien') {
    def r = app().handle('/book/edit/7')
    assert r.view == 'book/edit' && r.model == [id: 7L]
    def n = app().handle('/book/nothing')
    assert n.view == 'book/nothing' && n.model == [:] && n.status == 200
}

Spec.test('M3 · 404 : contrôleur, action, méthode privée, statique ou héritée du trait') {
    def a = app()
    ['/ticket', '/book/delete', '/book/secret', '/book/util', '/book/render', '/book/getParams', '/book/getLastTitle'].each { u ->
        assert a.handle(u).status == 404, "$u doit répondre 404"
    }
}

Spec.test('M3 · une instance par requête : params ne fuit pas') {
    def a = app()
    a.handle('/book/peek', [q: 'x'])
    assert a.handle('/book/peek/1').body == 'id'
}

Spec.test('M3 · la query de l\'appelant n\'est pas modifiée') {
    def q = [q: 'x']
    app().handle('/book/peek/9', q)
    assert q == [q: 'x']
}

Spec.test('M3 · render puis redirect dans une action : IllegalStateException') {
    try { app().handle('/book/twice'); assert false, 'deux réponses' }
    catch (IllegalStateException e) { }
    catch (java.lang.reflect.InvocationTargetException e) { assert e.cause instanceof IllegalStateException }
}

Spec.done()
