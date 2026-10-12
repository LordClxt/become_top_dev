Spec.test('constructeur nommé et prix par défaut') {
    def p = new Product(name: 'Tea', price: 3.5)
    assert p.name == 'Tea'
    assert p.price == 3.5
    assert new Product(name: 'Free').price == 0
}

Spec.test('le prix négatif est refusé par l\'affectation') {
    def p = new Product(name: 'Tea', price: 3.5)
    try {
        p.price = -1
        assert false, 'le setter aurait dû refuser -1'
    } catch (IllegalArgumentException e) {
        assert p.price == 3.5
    }
}

Spec.test('le prix négatif est refusé par le constructeur nommé') {
    try {
        new Product(name: 'Tea', price: -1)
        assert false, 'le constructeur nommé passe par le setter'
    } catch (IllegalArgumentException e) {
        assert e.message.contains('-1')
    }
}

Spec.test('label est une propriété calculée') {
    def p = new Product(name: 'Tea', price: 3.5)
    assert p.label == 'Tea (3.5 €)'
}

Spec.test('discounted renvoie un nouveau produit') {
    def p = new Product(name: 'Tea', price: 3.5)
    def d = p.discounted(10)
    assert d.price == 3.15
    assert d.name == 'Tea'
    assert !d.is(p)
    assert p.price == 3.5
}

Spec.test('parse tolère les espaces') {
    def p = Product.parse(' Tea :  3.50 ')
    assert p.name == 'Tea'
    assert p.price == 3.5
}

Spec.test('toString') {
    assert new Product(name: 'Tea', price: 3.5).toString() == 'Product(name:Tea, price:3.5)'
}

Spec.done()
