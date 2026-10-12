class Person {
    String name
    Map address
}

def model = [user: [name: 'ada', nick: null, age: 0, admin: false, tags: []],
             person: new Person(name: 'Grace', address: [city: 'Arlington'])]

Spec.test('chemin simple et texte autour') {
    assert Tpl.render('Bonjour ${user.name} !', model) == 'Bonjour ada !'
}

Spec.test('chemin dans un objet puis une map') {
    assert Tpl.render('${person.name} vit à ${person.address.city}', model) == 'Grace vit à Arlington'
}

Spec.test('maillon absent : chaîne vide, pas d\'exception') {
    assert Tpl.render('[${user.address.city}]', model) == '[]'
    assert Tpl.render('[${nobody.name}]', model) == '[]'
}

Spec.test('valeur par défaut') {
    assert Tpl.render('${user.nick ?: anonyme}', model) == 'anonyme'
    assert Tpl.render('${user.name ?: anonyme}', model) == 'ada'
    assert Tpl.render('${user.nick?:  deux mots }', model) == 'deux mots'
}

Spec.test('0, false et [] ne déclenchent pas le défaut') {
    assert Tpl.render('${user.age ?: x}/${user.admin ?: x}/${user.tags ?: x}', model) == '0/false/[]'
}

Spec.test('une chaîne blanche déclenche le défaut') {
    assert Tpl.render('${v ?: vide}', [v: '   ']) == 'vide'
}

Spec.test('filtres enchaînés de gauche à droite') {
    assert Tpl.render('${user.name|upper}', model) == 'ADA'
    assert Tpl.render('${v|trim|capitalize}', [v: '  linus ']) == 'Linus'
}

Spec.test('défaut appliqué avant les filtres') {
    assert Tpl.render('${user.nick ?: anonyme|upper}', model) == 'ANONYME'
}

Spec.test('filtres personnalisés et remplacement') {
    def filters = [reverse: { it.toString().reverse() }, upper: { "<${it}>" }]
    assert Tpl.render('${user.name|reverse}', model, filters) == 'ada'.reverse()
    assert Tpl.render('${user.name|upper}', model, filters) == '<ada>'
    assert Tpl.render('${user.name|lower}', model, filters) == 'ada'
}

Spec.test('filtre inconnu') {
    try {
        Tpl.render('${user.name|shout}', model)
        assert false, 'IllegalArgumentException attendue'
    } catch (IllegalArgumentException e) {
        assert e.message.contains('shout')
    }
}

Spec.test('échappement') {
    assert Tpl.render('prix : \\${user.name} = ${user.name}', model) == 'prix : ${user.name} = ada'
}

Spec.test('$ et \\ dans une valeur restent tels quels') {
    assert Tpl.render('${p}', [p: 'coût $5 \\ taxe']) == 'coût $5 \\ taxe'
}

Spec.done()
