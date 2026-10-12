Spec.test('retry : réussit dès le premier essai') {
    int calls = 0
    assert Toolbox.retry(3) { calls++; 'ok' } == 'ok'
    assert calls == 1
}

Spec.test('retry : réessaie jusqu\'au succès et passe le numéro de tentative') {
    def seen = []
    def r = Toolbox.retry(5) { n -> seen << n; if (n < 3) throw new IllegalStateException("échec $n"); "réussi à $n" }
    assert r == 'réussi à 3'
    assert seen == [1, 2, 3]
}

Spec.test('retry : relance la dernière exception après times échecs') {
    int calls = 0
    try {
        Toolbox.retry(3) { n -> calls++; throw new IllegalStateException("échec $n") }
        assert false, 'une exception était attendue'
    } catch (IllegalStateException e) {
        assert e.message == 'échec 3'
    }
    assert calls == 3
}

Spec.test('retry : times < 1 est refusé') {
    try {
        Toolbox.retry(0) { 1 }
        assert false, 'IllegalArgumentException attendue'
    } catch (IllegalArgumentException expected) { }
}

Spec.test('timed : renvoie le résultat et une durée entière positive') {
    def r = Toolbox.timed { Thread.sleep(30); 'fini' }
    assert r.result == 'fini'
    assert r.millis instanceof Integer || r.millis instanceof Long
    assert r.millis >= 25 && r.millis < 2000
}

Spec.test('once : exécute une seule fois et mémorise') {
    int calls = 0
    def init = Toolbox.once { calls++; 'valeur' }
    assert init() == 'valeur'
    assert init() == 'valeur'
    assert calls == 1
}

Spec.test('once : le premier appel fixe les arguments') {
    def f = Toolbox.once { a, b -> a + b }
    assert f(1, 2) == 3
    assert f(10, 20) == 3
}

Spec.test('once : si le premier appel échoue, rien n\'est mémorisé') {
    int calls = 0
    def f = Toolbox.once { calls++; if (calls == 1) throw new RuntimeException('raté'); 'ok' }
    try { f(); assert false, 'exception attendue' } catch (RuntimeException e) { assert e.message == 'raté' }
    assert f() == 'ok'
    assert f() == 'ok'
    assert calls == 2
}

Spec.test('groupCount : compte par clé, dans l\'ordre de première apparition') {
    assert Toolbox.groupCount(['pomme', 'poire', 'kiwi', 'prune', 'fraise']) { it[0] } == [p: 3, k: 1, f: 1].collectEntries { k, v -> [(k): v] }
    assert Toolbox.groupCount(['pomme', 'poire', 'kiwi', 'prune']) { it[0] }.keySet().toList() == ['p', 'k']
}

Spec.test('groupCount : une liste vide donne une map vide') {
    assert Toolbox.groupCount([]) { it } == [:]
}

Spec.test('groupCount : accepte n\'importe quel Iterable (intervalle)') {
    assert Toolbox.groupCount(1..6) { it % 3 } == [1: 2, 2: 2, 0: 2]
}

Spec.done()
