Spec.filter = args ? args[0] : null

class Person {
    String name
    Integer age
    static constraints = {
        name blank: false, size: 2..10
        age  range: 0..150, nullable: true
    }
}

class Plain { String x }

class Account {
    String username
    String password
    Integer balance
    static constraints = {
        username size: 3..8
        password validator: { pwd, acct -> pwd != acct.username }
        balance  nullable: true, validator: { v -> v >= 0 }
    }
}

class Codes {
    String a
    String b
    String c
    static constraints = {
        a validator: { v -> v == 'ok' ? true : 'codes.a.invalide' }
        b nullable: true, validator: { v, o -> v == o.a }
        c validator: { v, o, errors ->
            if (v.size() < 2) errors << 'c.court'
            if (!v.isNumber()) errors << 'c.nonNumerique'
        }
    }
}

Spec.test('M1 · un objet valide ne produit aucune erreur') {
    assert Domain.validate(new Person(name: 'Ada', age: 36)) == []
}

Spec.test('M1 · les règles du bloc constraints s\'appliquent') {
    assert Domain.validate(new Person(name: 'A', age: 200)) == ['name.size', 'age.range']
}

Spec.test('M1 · un champ non nullable absent est signalé') {
    assert Domain.validate(new Person(age: 3)) == ['name.nullable']
}

Spec.test('M1 · une classe sans constraints n\'a aucune règle') {
    assert Domain.validate(new Plain(x: 'n\'importe quoi')) == []
}

Spec.test('M1 · la closure constraints partagée n\'est pas modifiée') {
    def before = Person.constraints.delegate
    Domain.validate(new Person(name: 'Ada'))
    Domain.validate(new Person(name: 'Bo'))
    assert Person.constraints.delegate.is(before), 'tu as changé le delegate de la closure partagée : travaille sur une copie (rehydrate)'
    assert Domain.validate(new Person(name: 'Z')) == ['name.size']
}

Spec.test('M2 · validator à un paramètre : false donne champ.validator') {
    def ok = new Account(username: 'ada', password: 'secret', balance: 10)
    def bad = new Account(username: 'ada', password: 'secret', balance: -5)
    assert Domain.validate(ok) == []
    assert Domain.validate(bad) == ['balance.validator']
}

Spec.test('M2 · validator à deux paramètres : accès à l\'objet complet') {
    def acct = new Account(username: 'ada', password: 'ada', balance: 1)
    assert Domain.validate(acct) == ['password.validator']
}

Spec.test('M2 · validator à un paramètre : une String est le code d\'erreur') {
    def c = new Codes(a: 'KO', b: 'KO', c: '12')
    assert Domain.validate(c) == ['codes.a.invalide']
}

Spec.test('M2 · validator à trois paramètres : la closure ajoute ses propres codes') {
    def c = new Codes(a: 'ok', b: 'ok', c: 'x')
    assert Domain.validate(c) == ['c.court', 'c.nonNumerique']
}

Spec.test('M2 · le validator est ignoré quand la valeur est null et nullable') {
    assert Domain.validate(new Account(username: 'ada', password: 'x')) == []
}

Spec.test('M3 · validateAll ne garde que les objets invalides, par index') {
    def list = [new Person(name: 'Ada'), new Person(name: 'A'), new Person(name: 'Bob', age: 1), new Person(age: 5)]
    assert Domain.validateAll(list) == [1: ['name.size'], 3: ['name.nullable']]
}

Spec.test('M3 · validateAll d\'une liste valide ou vide') {
    assert Domain.validateAll([]) == [:]
    assert Domain.validateAll([new Person(name: 'Ada')]) == [:]
}

Spec.test('M3 · valid renvoie les objets valides dans l\'ordre') {
    def a = new Person(name: 'Ada'); def b = new Person(name: 'X'); def c = new Person(name: 'Cleo')
    assert Domain.valid([a, b, c]) == [a, c]
}

Spec.done()
