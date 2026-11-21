import java.lang.reflect.Modifier

class Note { String text }

def fresh() { Store.reset(); new Ticket(title: 'Imprimante') }

Spec.test('save : attribue un id et passe par toute la chaîne') {
    def t = fresh()
    assert t.save() == 'saved#1'
    assert t.id == 1
}

Spec.test('Timestamped : dateCreated au premier save, lastUpdated à chaque save') {
    def t = fresh()
    Store.now = new Date(1000); t.save()
    Store.now = new Date(5000); t.save()
    assert t.dateCreated == new Date(1000)
    assert t.lastUpdated == new Date(5000)
}

Spec.test('Audited : une entrée par save réussi, et un compteur') {
    def t = fresh()
    t.save(); t.save()
    assert t.auditLog == ["saved ticket 'Imprimante'", "saved ticket 'Imprimante'"]
    assert t.saveCount == 2
}

Spec.test('Audited : chaque instance a son propre journal') {
    def a = fresh(), b = new Ticket(title: 'Wi-Fi')
    a.save()
    assert b.auditLog == []
    assert !a.auditLog.is(b.auditLog)
}

Spec.test('Audited : getAuditName est exigé de la classe (méthode abstraite)') {
    def m = Audited.getMethod('getAuditName')
    assert Modifier.isAbstract(m.modifiers)
}

Spec.test('Validated : un ticket invalide est refusé') {
    Store.reset()
    def t = new Ticket(title: '   ')
    assert t.save() == 'refusé'
}

Spec.test('ordre : un ticket invalide ne reçoit ni id, ni horodatage, ni audit') {
    Store.reset()
    def t = new Ticket(title: '')
    t.save()
    assert t.id == null
    assert t.dateCreated == null && t.lastUpdated == null
    assert t.auditLog == [] && t.saveCount == 0
    assert Store.saved == []
}

Spec.test('Validated : isValid est exigé de la classe') {
    assert Modifier.isAbstract(Validated.getMethod('isValid').modifiers)
}

Spec.test('SoftDeletable : suppression logique') {
    def t = fresh()
    assert t.active
    Store.now = new Date(9000)
    t.softDelete()
    assert t.deleted && !t.active
    assert t.deletedAt == new Date(9000)
}

Spec.test('Ticket implémente les cinq capacités') {
    def t = fresh()
    [Persistent, Timestamped, Audited, Validated, SoftDeletable].each { assert it.isInstance(t) : "Ticket doit implémenter $it.simpleName" }
}

Spec.test('withTraits : un objet existant devient supprimable, via un proxy') {
    Store.reset()
    def note = new Note(text: 'à jeter').withTraits(SoftDeletable)
    note.softDelete()
    assert note.deleted
    assert note.text == 'à jeter'
    assert !(note instanceof Note) : 'withTraits renvoie un proxy : ce n’est plus un Note'
}

Spec.done()
