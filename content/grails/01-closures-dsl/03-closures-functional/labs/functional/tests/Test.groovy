Spec.test('compose : applique les closures de gauche à droite') {
    def f = Fn.compose({ it + 1 }, { it * 2 }, { "= $it" })
    assert f(3) == '= 8'
}

Spec.test('compose : sans closure, c\'est l\'identité') {
    assert Fn.compose()(42) == 42
}

Spec.test('compose : une seule closure') {
    assert Fn.compose({ it.toUpperCase() })('abc') == 'ABC'
}

Spec.test('partial : fixe les premiers paramètres') {
    def add3 = { a, b, c -> a + b + c }
    assert Fn.partial(add3, 1, 2)(3) == 6
    assert Fn.partial(add3, 1)(2, 3) == 6
}

Spec.test('withLast : fixe le dernier paramètre') {
    def minus = { a, b -> a - b }
    assert Fn.withLast(minus, 1)(10) == 9
}

Spec.test('partial et withLast ne modifient pas la closure d\'origine') {
    def minus = { a, b -> a - b }
    Fn.partial(minus, 100)
    Fn.withLast(minus, 100)
    assert minus(5, 3) == 2
}

Spec.test('cached : ne calcule qu\'une fois par argument') {
    int calls = 0
    def slow = { n -> calls++; n * n }
    def fast = Fn.cached(slow)
    assert fast(4) == 16
    assert fast(4) == 16
    assert fast(5) == 25
    assert calls == 2, "la closure d'origine a été appelée ${calls} fois au lieu de 2"
}

Spec.test('sumTo : petites valeurs') {
    assert Fn.sumTo(0) == 0
    assert Fn.sumTo(10) == 55
}

Spec.test('sumTo : 200 000 sans débordement de pile') {
    assert Fn.sumTo(200_000) == 20_000_100_000L
}

Spec.done()
