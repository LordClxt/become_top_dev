class Greeter {
    String name
    String greet() { "salut $name" }
}

class Holder {
    String name = 'owner'
    Closure make() { return { name } }
}

Spec.test('accumulator : additionne et renvoie le total') {
    def acc = Scope.accumulator(10)
    assert acc(5) == 15
    assert acc(1) == 16
}

Spec.test('accumulator : deux accumulateurs sont indépendants') {
    def a = Scope.accumulator(0)
    def b = Scope.accumulator(100)
    a(1); a(1)
    assert a(1) == 3
    assert b(1) == 101
}

Spec.test('counters : inc et value partagent le même compteur') {
    def c = Scope.counters()
    assert c.value() == 0
    assert c.inc() == 1
    assert c.inc() == 2
    assert c.value() == 2
}

Spec.test('counters : chaque appel crée un compteur neuf') {
    def c1 = Scope.counters()
    def c2 = Scope.counters()
    c1.inc(); c1.inc()
    assert c2.value() == 0
    assert c1.value() == 2
}

Spec.test('runWith : une map en delegate expose ses clés comme des propriétés') {
    assert Scope.runWith([a: 1, b: 2]) { a + b } == 3
}

Spec.test('runWith : les méthodes du delegate sont appelables') {
    assert Scope.runWith(new Greeter(name: 'Ada')) { greet() } == 'salut Ada'
}

Spec.test('runWith : le delegate passe avant l\'owner (DELEGATE_FIRST)') {
    def closureFromHolder = new Holder().make()   // son owner a une propriété `name` = 'owner'
    assert closureFromHolder() == 'owner'
    assert Scope.runWith(new Greeter(name: 'delegate'), closureFromHolder) == 'delegate'
}

Spec.test('runWith : renvoie la valeur de la closure') {
    assert Scope.runWith('abc') { size() * 2 } == 6
}

Spec.done()
