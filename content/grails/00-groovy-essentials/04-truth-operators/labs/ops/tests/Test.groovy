Spec.test('Money : plus, minus, négatif') {
    def a = Money.of('10.50')
    def b = Money.of('0.75')
    assert (a + b).cents == 1125
    assert (a - b).cents == 975
    assert (-a).cents == -1050
    assert a.cents == 1050   // inchangé
}

Spec.test('Money : pas de double') {
    assert Money.of('0.1') + Money.of('0.2') == Money.of('0.3')
    assert (Money.of('0.05') * 1.5).cents == 8
    assert (Money.of('10.00') * 3).cents == 3000
}

Spec.test('Money : égalité et comparaison') {
    assert Money.of('1') == Money.of('1.00')
    assert Money.of('1') != Money.of('1.01')
    assert Money.of('1.00') < Money.of('1.01')
    assert Money.of('5') >= Money.of('5')
    assert [Money.of('3'), Money.of('1'), Money.of('2')].sort()*.cents == [100, 200, 300]
    assert [Money.of('3'), Money.of('1')].max() == Money.of('3')
}

Spec.test('Money : vérité Groovy') {
    assert Money.of('0.01')
    assert !Money.of('0')
    assert !(Money.of('1') - Money.of('1'))
}

Spec.test('Money : toString') {
    assert Money.of('12.5').toString() == '12.50 €'
    assert Money.of('-3.05').toString() == '-3.05 €'
    assert Money.of('0').toString() == '0.00 €'
    assert "${Money.of('7')}" == '7.00 €'
}

Spec.test('classify : nombres et null') {
    assert Ops.classify(null) == 'nothing'
    assert Ops.classify(7) == 'digit'
    assert Ops.classify(42) == 'number'
    assert Ops.classify(3.5) == 'number'
}

Spec.test('classify : chaînes') {
    assert Ops.classify('2024') == 'numeric text'
    assert Ops.classify('grails') == 'text'
    assert Ops.classify("${1 + 1}") == 'numeric text'
}

Spec.test('classify : collections et reste') {
    assert Ops.classify([]) == 'empty list'
    assert Ops.classify([1, 2]) == 'list'
    assert Ops.classify([a: 1]) == 'map'
    assert Ops.classify(new Object()) == 'object'
}

Spec.test('city : accès sécurisés') {
    assert Ops.city([address: [city: 'Lyon']]) == 'Lyon'
    assert Ops.city(null) == 'inconnue'
    assert Ops.city([address: null]) == 'inconnue'
    assert Ops.city([address: [city: '']]) == 'inconnue'
}

Spec.test('firstFilled : ignore null, vide et espaces') {
    assert Ops.firstFilled([null, '', '   ', 'ok', 'autre']) == 'ok'
    assert Ops.firstFilled([null, ' ']) == null
}

Spec.done()
