def keyboard() { new Line(sku: 'KB-01', name: 'Clavier', price: 49.90) }
def mouse() { new Line(sku: 'MS-02', name: 'Souris', price: 19.90) }

Spec.test('un article ajouté deux fois : une seule ligne, quantité 2') {
    def cart = new Cart()
    cart.add(keyboard()); cart.add(keyboard())
    assert cart.lines().size() == 1
    assert cart.lines()[0].qty == 2
}

Spec.test('le total correspond aux lignes affichées') {
    def cart = new Cart()
    cart.add(keyboard()); cart.add(keyboard()); cart.add(mouse())
    def invoice = new Invoice(cart)
    def shown = invoice.displayLines().sum { it.price * it.qty }
    assert shown == cart.total()
    assert cart.total() == 119.70
}

Spec.test('la facture affiche les bonnes quantités') {
    def cart = new Cart()
    cart.add(keyboard()); cart.add(keyboard()); cart.add(mouse())
    assert new Invoice(cart).render() == "Clavier ×2\nSouris ×1\nTotal : 119.70 €"
}

Spec.test('remove retire l\'article') {
    def cart = new Cart()
    cart.add(keyboard()); cart.add(mouse())
    cart.remove('KB-01')
    assert cart.lines()*.sku == ['MS-02']
    assert cart.total() == 19.90
}

Spec.test('deux lignes de même sku sont égales, partout') {
    def a = keyboard(), b = new Line(sku: 'KB-01', name: 'Clavier AZERTY', price: 52.00, qty: 3)
    assert a == b
    assert a.equals((Object) b) : 'equals(Object), celui des collections Java, doit dire la même chose que =='
    assert a.hashCode() == b.hashCode() : 'deux objets égaux doivent avoir le même hashCode'
    assert [a].contains(b)
    assert new HashSet([a, b]).size() == 1
}

Spec.test('deux sku différents ne sont pas égaux') {
    assert keyboard() != mouse()
    assert !keyboard().equals((Object) mouse())
}

Spec.test('une ligne n\'est égale ni à null ni à un autre type') {
    assert !keyboard().equals(null)
    assert !keyboard().equals('KB-01')
}

Spec.done()
