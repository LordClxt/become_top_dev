def person = Validator.build {
    name  blank: false, size: 2..10
    age   range: 0..150, nullable: true
    role  inList: ['admin', 'user']
    code  matches: '[A-Z]{3}-\\d+', nullable: true
}

Spec.test('une donnée valide ne produit aucune erreur') {
    assert person.validate([name: 'Ada', age: 36, role: 'admin', code: 'ABC-12']) == []
}

Spec.test('size : trop court et trop long') {
    assert person.validate([name: 'A', role: 'user']) == ['name.size']
    assert person.validate([name: 'Abcdefghijk', role: 'user']) == ['name.size']
}

Spec.test('blank : une chaîne d\'espaces est refusée') {
    def errors = person.validate([name: '   ', role: 'user'])
    assert 'name.blank' in errors
}

Spec.test('range : hors intervalle') {
    assert person.validate([name: 'Ada', age: 200, role: 'user']) == ['age.range']
}

Spec.test('inList : valeur non permise') {
    assert person.validate([name: 'Ada', role: 'root']) == ['role.inList']
}

Spec.test('matches : la valeur doit satisfaire l\'expression en entier') {
    assert person.validate([name: 'Ada', role: 'user', code: 'abc-1']) == ['code.matches']
    assert person.validate([name: 'Ada', role: 'user', code: 'ABC-1x']) == ['code.matches']
}

Spec.test('par défaut un champ ne peut pas être null (comme dans GORM)') {
    assert person.validate([role: 'user']) == ['name.nullable']
}

Spec.test('nullable: true accepte null sans autre test') {
    assert person.validate([name: 'Ada', role: 'user', age: null, code: null]) == []
}

Spec.test('plusieurs erreurs : ordre de déclaration des champs') {
    assert person.validate([name: 'A', age: -1, role: 'x']) == ['name.size', 'age.range', 'role.inList']
}

Spec.test('les clés sans règle sont ignorées') {
    assert person.validate([name: 'Ada', role: 'user', extra: 'peu importe']) == []
}

Spec.test('une contrainte inconnue est refusée dès le build') {
    try {
        Validator.build { name blank: false, unique: true }
        assert false, 'IllegalArgumentException attendue'
    } catch (IllegalArgumentException e) {
        assert e.message == 'contrainte inconnue : unique'
    }
}

Spec.test('deux validateurs sont indépendants') {
    def a = Validator.build { x range: 1..2 }
    def b = Validator.build { y range: 1..2 }
    assert a.validate([x: 5]) == ['x.range']
    assert b.validate([x: 5]) == ['y.nullable']
}

Spec.done()
