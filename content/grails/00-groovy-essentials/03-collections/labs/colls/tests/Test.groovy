Spec.test('wordFrequencies : casse ignorée, tri par fréquence puis alphabétique') {
    def f = Colls.wordFrequencies('b a B c a b')
    assert f == [b: 3, a: 2, c: 1]
    assert f.keySet().toList() == ['b', 'a', 'c']
}

Spec.test('wordFrequencies : égalité départagée par ordre alphabétique') {
    assert Colls.wordFrequencies('zoo bar zoo bar abc').keySet().toList() == ['bar', 'zoo', 'abc']
}

Spec.test('wordFrequencies : ponctuation ignorée') {
    assert Colls.wordFrequencies('Hi, hi! ho.') == [hi: 2, ho: 1]
}

Spec.test('groupByInitial : initiales en majuscule, listes triées') {
    def g = Colls.groupByInitial(['banane', 'avocat', 'abricot'])
    assert g == [B: ['banane'], A: ['abricot', 'avocat']]
}

Spec.test('groupByInitial ne modifie pas la liste reçue') {
    def words = ['b', 'a', 'a2']
    Colls.groupByInitial(words)
    assert words == ['b', 'a', 'a2']
}

Spec.test('indexBy : la dernière ligne gagne') {
    def rows = [[id: 1, n: 'x'], [id: 2, n: 'y'], [id: 1, n: 'z']]
    def idx = Colls.indexBy(rows, 'id')
    assert idx.keySet() == [1, 2] as Set
    assert idx[1].n == 'z'
}

Spec.test('flattenRanges : trié, sans doublon, range inversé accepté') {
    assert Colls.flattenRanges([1..3, 2..5]) == [1, 2, 3, 4, 5]
    assert Colls.flattenRanges([5..3, 1..<3]) == [1, 2, 3, 4, 5]
}

Spec.test('sortedCopy : ne modifie pas la source') {
    def src = [3, 1, 2]
    def out = Colls.sortedCopy(src)
    assert out == [1, 2, 3]
    assert src == [3, 1, 2]
    assert !out.is(src)
}

Spec.done()
