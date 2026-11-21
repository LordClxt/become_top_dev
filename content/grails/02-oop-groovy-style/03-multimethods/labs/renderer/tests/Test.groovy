class Image extends Fragment {}

Spec.test('texte échappé') {
    assert Html.render([new Text('a < b & "c"')] as List<Fragment>) == 'a &lt; b &amp; &quot;c&quot;'
}

Spec.test('code') {
    assert Html.render([new Code('x && y')] as List<Fragment>) == '<code>x &amp;&amp; y</code>'
}

Spec.test('gras imbriqué') {
    List<Fragment> doc = [new Bold([new Text('urgent'), new Code('500')] as List<Fragment>)]
    assert Html.render(doc) == '<strong>urgent<code>500</code></strong>'
}

Spec.test('lien interne') {
    List<Fragment> doc = [new Link('/tickets/12', [new Text('#12')] as List<Fragment>)]
    assert Html.render(doc) == '<a href="/tickets/12">#12</a>'
}

Spec.test('lien externe : la surcharge la plus proche gagne') {
    List<Fragment> doc = [new ExternalLink('https://status.io', [new Text('statut')] as List<Fragment>)]
    assert Html.render(doc) == '<a href="https://status.io" rel="noopener" target="_blank">statut</a>'
}

Spec.test('attribut href échappé') {
    List<Fragment> doc = [new Link('/q?a=1&b="2"', [new Text('x')] as List<Fragment>)]
    assert Html.render(doc) == '<a href="/q?a=1&amp;b=&quot;2&quot;">x</a>'
}

Spec.test('document complet, nœuds déclarés Fragment') {
    List<Fragment> doc = [
        new Text('Voir '),
        new Link('/tickets/3', [new Bold([new Text('#3')] as List<Fragment>)] as List<Fragment>),
        new Text(' et '),
        new ExternalLink('https://x.io', [new Code('x.io')] as List<Fragment>),
    ]
    assert Html.render(doc) == 'Voir <a href="/tickets/3"><strong>#3</strong></a> et <a href="https://x.io" rel="noopener" target="_blank"><code>x.io</code></a>'
}

Spec.test('un nœud seul, déclaré Fragment, part dans la bonne surcharge') {
    Fragment n = new Bold([new Text('a')] as List<Fragment>)
    assert Html.render(n) == '<strong>a</strong>'
}

Spec.test('enfant null ignoré') {
    List<Fragment> doc = [new Text('a'), null, new Bold([null, new Text('b')] as List<Fragment>)]
    assert Html.render(doc) == 'a<strong>b</strong>'
}

Spec.test('liste vide') {
    assert Html.render([] as List<Fragment>) == ''
}

Spec.test('nœud inconnu : IllegalArgumentException avec le nom de la classe') {
    try {
        Html.render([new Text('x'), new Image()] as List<Fragment>)
        assert false, 'un nœud Image doit être refusé'
    } catch (IllegalArgumentException e) {
        assert e.message == 'nœud non géré : Image'
    }
}

Spec.done()
