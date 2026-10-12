def csv = '''date,customer,product,qty,unitPrice
2024-01-03, Ada , Tea , 2 , 3.50
2024-01-04,Linus,Coffee,1,4.20

2024-01-05,Ada,Coffee,3,4.20
2024-01-06,Grace,Tea,1,3.50
'''

Spec.test('parse : en-tête et lignes vides ignorés, types corrects') {
    def rows = Report.parse(csv)
    assert rows.size() == 4
    assert rows[0] == [date: '2024-01-03', customer: 'Ada', product: 'Tea', qty: 2, unitPrice: 3.5, total: 7.0]
    assert rows[0].qty instanceof Integer
    assert rows[0].total instanceof BigDecimal
}

Spec.test('parse : mauvais nombre de colonnes, avec le numéro de ligne') {
    try {
        Report.parse('h\na,b,c')
        assert false, 'IllegalArgumentException attendue'
    } catch (IllegalArgumentException e) {
        assert e.message.contains('2')
    }
}

Spec.test('parse : nombre illisible, avec le numéro de ligne') {
    try {
        Report.parse('h\n\nd,c,p,deux,1.5')
        assert false, 'IllegalArgumentException attendue'
    } catch (IllegalArgumentException e) {
        assert e.message.contains('3')
    }
}

Spec.test('byCustomer : total décroissant puis nom') {
    def r = Report.byCustomer(Report.parse(csv))
    assert r == [Ada: 19.6, Linus: 4.2, Grace: 3.5]
    assert r.keySet().toList() == ['Ada', 'Linus', 'Grace']
}

Spec.test('byCustomer : exactitude décimale') {
    def rows = [[customer: 'x', total: 0.1], [customer: 'x', total: 0.2]]
    assert Report.byCustomer(rows).x == 0.3
}

Spec.test('topProducts : quantité décroissante, égalité alphabétique') {
    def rows = Report.parse(csv)
    assert Report.topProducts(rows, 2) == ['Coffee', 'Tea']
    assert Report.topProducts(rows, 1) == ['Coffee']
    assert Report.topProducts([[product: 'b', qty: 1], [product: 'a', qty: 1]], 5) == ['a', 'b']
}

Spec.test('render : deux décimales') {
    assert Report.render(Report.parse(csv)) == ['Ada: 19.60', 'Linus: 4.20', 'Grace: 3.50']
    assert Report.render([[customer: 'x', total: 1.005]]) == ['x: 1.01']
}

Spec.test('les lignes reçues ne sont pas modifiées') {
    def rows = Report.parse(csv)
    def copy = rows.collect { new LinkedHashMap(it) }
    Report.byCustomer(rows); Report.topProducts(rows, 2); Report.render(rows)
    assert rows == copy
}

Spec.done()
