Spec.test('email : normalisé par le constructeur nommé') {
    def a = new Account(name: 'Ana', email: '  Ana@Mail.IO ')
    assert a.email == 'ana@mail.io'
}

Spec.test('email : normalisé par une affectation') {
    def a = new Account(name: 'Ana')
    a.email = 'BOB@X.FR '
    assert a.email == 'bob@x.fr'
}

Spec.test('email : null reste null') {
    def a = new Account(name: 'Ana', email: null)
    assert a.email == null
}

Spec.test('id : format acc- suivi de 8 caractères, différent pour chaque compte') {
    def a = new Account(name: 'A'), b = new Account(name: 'B')
    assert a.id ==~ /acc-.{8}/
    assert a.id != b.id
}

Spec.test('id : en lecture seule') {
    def a = new Account(name: 'A')
    def before = a.id
    try {
        a.id = 'pirate'
        assert false, "a.id = 'pirate' aurait dû lever ReadOnlyPropertyException"
    } catch (ReadOnlyPropertyException expected) { }
    assert a.id == before
}

Spec.test('displayName : calculé à partir du nom et de l\'email') {
    def a = new Account(name: 'Ana Lovelace', email: 'Ana@Mail.io')
    assert a.displayName == 'Ana Lovelace <ana@mail.io>'
    a.email = 'ada@x.org'
    assert a.displayName == 'Ana Lovelace <ada@x.org>' : 'displayName doit suivre la valeur actuelle de email (pas de champ figé)'
}

Spec.test('displayName : seulement le nom sans email') {
    assert new Account(name: 'Ana').displayName == 'Ana'
}

Spec.test('displayName : pas de champ de stockage') {
    assert !Account.declaredFields*.name.contains('displayName') : 'displayName est une propriété calculée : un getter, sans champ'
}

Spec.test('locked : accessible par isLocked()') {
    def a = new Account(name: 'A', locked: true)
    assert a.isLocked()
    assert a.properties.locked == true
}

Spec.done()
