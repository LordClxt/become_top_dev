Spec.test('collectAdaptive : un paramètre reçoit l\'entrée') {
    def r = Callbacks.collectAdaptive([a: 1, b: 2]) { e -> e.key + e.value }
    assert r == ['a1', 'b2']
}

Spec.test('collectAdaptive : deux paramètres reçoivent clé et valeur') {
    def r = Callbacks.collectAdaptive([a: 1, b: 2]) { k, v -> k * v }
    assert r == ['a', 'bb']
}

Spec.test('collectAdaptive : le paramètre implicite `it` compte pour un paramètre') {
    def r = Callbacks.collectAdaptive([x: 10]) { it.value + 1 }
    assert r == [11]
}

Spec.test('collectAdaptive : garde l\'ordre de la map') {
    def r = Callbacks.collectAdaptive([z: 1, y: 2, x: 3]) { k, v -> k }
    assert r == ['z', 'y', 'x']
}

Spec.test('withResource : ouvre, utilise, ferme') {
    def log = []
    def result = Callbacks.withResource(log) { l -> l << 'use'; 42 }
    assert result == 42
    assert log == ['open', 'use', 'close']
}

Spec.test('withResource : ferme même en cas d\'exception, et la relance') {
    def log = []
    try {
        Callbacks.withResource(log) { throw new IllegalStateException('boum') }
        assert false, 'l\'exception aurait dû être relancée'
    } catch (IllegalStateException e) {
        assert e.message == 'boum'
    }
    assert log == ['open', 'close']
}

Spec.test('firstOver : trouve le premier élément au-dessus de la limite') {
    assert Callbacks.firstOver([1, 5, 9, 12, 3], 8) == 9
    assert Callbacks.firstOver([1, 2], 8) == null
}

Spec.test('firstOver : s\'arrête dès qu\'il a trouvé') {
    int visited = 0
    def source = [1, 5, 9, 12, 3, 40]
    def iterable = new Iterable() {
        Iterator iterator() {
            def inner = source.iterator()
            [hasNext: { inner.hasNext() }, next: { visited++; inner.next() }] as Iterator
        }
    }
    assert Callbacks.firstOver(iterable, 8) == 9
    assert visited == 3, "on a lu ${visited} éléments au lieu de 3 : tu parcours le reste de la liste"
}

Spec.done()
