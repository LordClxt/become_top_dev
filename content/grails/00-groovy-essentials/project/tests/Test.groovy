Spec.filter = args ? args[0] : null

class Person {
    String name
    int age
    Integer score
    boolean active
    BigDecimal balance = 0
    String role = 'USER'
    def notes
    static String origin = 'factory'
}

Spec.test('M1 texte vers nombres') {
    assert Binder.convert(Integer, '36') == 36
    assert Binder.convert(int, ' 36 ') == 36
    assert Binder.convert(Long, '9000000000') == 9000000000L
    assert Binder.convert(BigDecimal, '12.50') == 12.5
    assert Binder.convert(BigDecimal, '12.50') instanceof BigDecimal
}

Spec.test('M1 chaînes : trim et vide vers null') {
    assert Binder.convert(String, '  Ada  ') == 'Ada'
    assert Binder.convert(String, '   ') == null
    assert Binder.convert(Integer, '') == null
    assert Binder.convert(String, null) == null
}

Spec.test('M1 booléens') {
    assert Binder.convert(boolean, 'on') == true
    assert Binder.convert(Boolean, 'YES') == true
    assert Binder.convert(boolean, '0') == false
    assert Binder.convert(Boolean, 'off') == false
}

Spec.test('M1 valeur déjà typée renvoyée telle quelle') {
    assert Binder.convert(Integer, 5) == 5
    assert Binder.convert(int, 5) == 5
    assert Binder.convert(BigDecimal, 1.5) == 1.5
}

Spec.test('M1 conversions impossibles') {
    [[Integer, 'abc'], [boolean, 'peut-être'], [BigDecimal, '1,5'], [Date, '2024-01-01']].each { type, raw ->
        try {
            Binder.convert(type, raw)
            assert false, "${type.simpleName} <- '${raw}' aurait dû échouer"
        } catch (IllegalArgumentException e) {
            assert true
        }
    }
}

Spec.test('M2 liaison complète') {
    def p = new Person()
    def errors = Binder.bind(p, [name: ' Ada ', age: '36', score: '7', active: 'on', balance: '12.50'])
    assert errors == [:]
    assert p.name == 'Ada' && p.age == 36 && p.score == 7 && p.active && p.balance == 12.5
}

Spec.test('M2 clés inconnues, statiques et non typées ignorées') {
    def p = new Person()
    Binder.bind(p, [unknown: 'x', origin: 'hack', notes: 'x', metaClass: 'x'])
    assert Person.origin == 'factory'
    assert p.notes == null
}

Spec.test('M2 typeMismatch sans arrêter la liaison') {
    def p = new Person(age: 1)
    def errors = Binder.bind(p, [age: 'trente', name: 'Linus', active: 'peut-être'])
    assert errors == [age: 'typeMismatch', active: 'typeMismatch']
    assert p.name == 'Linus'
    assert p.age == 1
}

Spec.test('M2 vide : null pour un objet, inchangé pour un primitif') {
    def p = new Person(name: 'Ada', age: 3, score: 9)
    def errors = Binder.bind(p, [name: '', age: '', score: ' '])
    assert errors == [:]
    assert p.name == null
    assert p.age == 3
    assert p.score == null
}

Spec.test('M3 exclude bloque l\'affectation de masse') {
    def p = new Person()
    Binder.bind(p, [name: 'Ada', role: 'ADMIN'], [exclude: ['role']])
    assert p.name == 'Ada'
    assert p.role == 'USER'
}

Spec.test('M3 include liste les seules propriétés liables') {
    def p = new Person()
    Binder.bind(p, [name: 'Ada', age: '40', role: 'ADMIN'], [include: ['name', 'age']])
    assert p.name == 'Ada' && p.age == 40
    assert p.role == 'USER'
}

Spec.test('M3 exclude l\'emporte sur include') {
    def p = new Person()
    Binder.bind(p, [name: 'Ada', role: 'ADMIN'], [include: ['name', 'role'], exclude: ['role']])
    assert p.role == 'USER'
}

Spec.test('M3 une erreur sur une propriété exclue n\'est pas signalée') {
    def p = new Person()
    assert Binder.bind(p, [age: 'abc', name: 'x'], [exclude: ['age']]) == [:]
}

Spec.done()
