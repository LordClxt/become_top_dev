class Book {
    String title
    int year
    String toString() { title }
}

def books = [
    new Book(title: 'Clean Code', year: 2008),
    new Book(title: 'Accelerate', year: 2018),
    new Book(title: 'Refactoring', year: 1999),
    new Book(title: 'Domain-Driven Design', year: 2003),
    new Book(title: 'Effective Java', year: 2018),
]
def numbers = (1..250).toList()

Spec.test('sans option : 10 premiers éléments, total et bornes') {
    def r = Pager.page(numbers)
    assert r.items == (1..10).toList()
    assert r.total == 250 && r.max == 10 && r.offset == 0
}

Spec.test('arguments nommés écrits après la liste') {
    def r = Pager.page(numbers, max: 3, offset: 5)
    assert r.items == [6, 7, 8]
}

Spec.test('valeurs texte venues de HTTP') {
    def r = Pager.page(max: '3', offset: '10', numbers)
    assert r.items == [11, 12, 13]
    assert r.max == 3 && r.offset == 10
}

Spec.test('max : plafonné à 100') {
    assert Pager.page(max: '1000000', numbers).items.size() == 100
}

Spec.test('max : au moins 1') {
    assert Pager.page(max: 0, numbers).max == 1
    assert Pager.page(max: '-5', numbers).max == 1
}

Spec.test('max et offset non convertibles : valeurs par défaut') {
    def r = Pager.page(max: 'abc', offset: 'x', numbers)
    assert r.max == 10 && r.offset == 0
    assert Pager.page(max: null, numbers).max == 10
}

Spec.test('offset négatif ramené à 0') {
    assert Pager.page(offset: -3, numbers).items[0] == 1
}

Spec.test('offset au-delà de la fin : page vide, total conservé') {
    def r = Pager.page(offset: 300, numbers)
    assert r.items == [] && r.total == 250
}

Spec.test('sort : par propriété, ascendant par défaut') {
    assert Pager.page(sort: 'title', books).items*.title == ['Accelerate', 'Clean Code', 'Domain-Driven Design', 'Effective Java', 'Refactoring']
}

Spec.test('order : desc, sans tenir compte de la casse') {
    def r = Pager.page(sort: 'title', order: 'DESC', max: '2', offset: 1, books)
    assert r.items*.title == ['Effective Java', 'Domain-Driven Design']
    assert r.total == 5
}

Spec.test('order : valeur inconnue → asc') {
    assert Pager.page(sort: 'year', order: 'n importe quoi', max: 1, books).items*.year == [1999]
}

Spec.test('sort : marche aussi sur des Maps') {
    def rows = [[name: 'b'], [name: 'c'], [name: 'a']]
    assert Pager.page(sort: 'name', rows).items == [[name: 'a'], [name: 'b'], [name: 'c']]
}

Spec.test('sort : la liste reçue n\'est pas modifiée') {
    def copy = new ArrayList(books)
    Pager.page(sort: 'title', books)
    assert books == copy
}

Spec.test('clé inconnue : refusée, avec la clé fautive et les clés admises') {
    try {
        Pager.page(mx: 5, numbers)
        assert false, 'mx est une faute de frappe : elle doit être refusée'
    } catch (IllegalArgumentException e) {
        assert e.message.contains('mx')
        assert ['max', 'offset', 'sort', 'order'].every { e.message.contains(it) }
    }
}

Spec.test('sort sur une propriété inexistante : refusé') {
    try {
        Pager.page(sort: 'password', books)
        assert false, 'trier sur une propriété inconnue doit être refusé'
    } catch (IllegalArgumentException e) {
        assert e.message.contains('password')
    }
}

Spec.test('la Map d\'options de l\'appelant n\'est pas modifiée') {
    def opts = [max: '2']
    Pager.page(opts, numbers)
    assert opts == [max: '2']
}

Spec.test('DEFAULTS sert de base avec *:') {
    def r = Pager.page(*:Pager.DEFAULTS, max: 5, numbers)
    assert r.items == (1..5).toList()
}

Spec.done()
