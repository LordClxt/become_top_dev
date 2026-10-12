Spec.test('slug : cas simple') {
    assert Text.slug('Hello, World! 2024') == 'hello-world-2024'
}

Spec.test('slug : retire les tirets des extrémités et fusionne les blocs') {
    assert Text.slug('  --Grails 7 rocks-- ') == 'grails-7-rocks'
    assert Text.slug('a   b___c') == 'a-b-c'
}

Spec.test('versions : majeur.mineur et majeur.mineur.patch') {
    def v = Text.versions('Grails 7.0 et Groovy 4.0.33')
    assert v == [[major: 7, minor: 0, patch: 0], [major: 4, minor: 0, patch: 33]]
}

Spec.test('versions : rien à trouver') {
    assert Text.versions('pas de numéro ici') == []
}

Spec.test('greeting : la GString est paresseuse') {
    def ctx = [name: 'Ada']
    def g = Text.greeting(ctx)
    assert g.toString() == 'Hello Ada'
    ctx.name = 'Grace'
    assert g.toString() == 'Hello Grace'
}

Spec.test('total : BigDecimal exact') {
    def t = Text.total(['0.1', '0.2'])
    assert t instanceof BigDecimal
    assert t == 0.3
    assert Text.total([]) == 0
}

Spec.test('isHexColor : la regex doit couvrir toute la chaîne') {
    assert Text.isHexColor('#00ff7F')
    assert !Text.isHexColor('#00ff7')
    assert !Text.isHexColor('xx#00ff7Fxx')
}

Spec.done()
