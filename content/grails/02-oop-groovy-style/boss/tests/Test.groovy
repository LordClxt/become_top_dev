class Mystery extends Item {}

class Standard implements BasePricing, VolumeDiscount, LoyaltyDiscount {}
class CouponThenVolume implements BasePricing, CouponDiscount, VolumeDiscount {}
class VolumeThenCoupon implements BasePricing, VolumeDiscount, CouponDiscount {}
class Capped implements BasePricing, VolumeDiscount, Cap { BigDecimal cap = 400.00 }
class CapUnderLoyalty implements BasePricing, Cap, LoyaltyDiscount { BigDecimal cap = 100.00 }
class Headless implements VolumeDiscount {}

def p = new Pricer()
def big() { [new Seat(50), new Storage(300)] as Item[] }   // 480.00 + 30.00 = 510.00

Spec.test('prix des sièges : palier à 10') {
    assert p.price(new Seat(1)) == 12.00
    assert p.price(new Seat(10)) == 120.00
    assert p.price(new Seat(12)) == 138.00
}

Spec.test('prix des tickets et des tickets urgents') {
    assert [1, 2, 3].collect { p.price(new Ticket(it)) } == [5.00, 2.50, 1.00]
    assert p.price(new UrgentTicket(2)) == 5.00
}

Spec.test('stockage : minimum 1.00') {
    assert p.price(new Storage(5)) == 1.00
    assert p.price(new Storage(300)) == 30.00
}

Spec.test('le bon prix depuis une List<Item>') {
    List<Item> items = [new UrgentTicket(1), new Seat(1), new Ticket(1), new Storage(20)]
    assert items.collect { Item i -> p.price(i) } == [10.00, 12.00, 5.00, 2.00]
}

Spec.test('erreurs du tarif : priorité inconnue, article inconnu, null') {
    try { p.price(new Ticket(4)); assert false, 'priorité 4' } catch (IllegalArgumentException e) { }
    try { p.price(new Mystery()); assert false, 'Mystery n\'a pas de tarif' }
    catch (IllegalArgumentException e) { assert e.message.contains('Mystery') }
    try { p.price(null); assert false, 'null' } catch (IllegalArgumentException e) { }
}

Spec.test('devis sans plan : total == sous-total, lignes calculées') {
    def q = Quote.of(new Ticket(1), new UrgentTicket(2), new Storage(5))
    assert q.subtotal.toString() == '11.00'
    assert q.total.toString() == '11.00'
    assert q.lines == [[item: 'Ticket', price: 5.00], [item: 'UrgentTicket', price: 5.00], [item: 'Storage', price: 1.00]]
}

Spec.test('plan standard : volume puis fidélité') {
    assert Quote.of(big(), plan: new Standard(), customerYears: 3).total.toString() == '431.46'
    assert Quote.of(big(), plan: new Standard(), customerYears: '7').total.toString() == '413.10'
}

Spec.test('le volume dépend du sous-total, pas du montant reçu') {
    assert Quote.of(new Seat(10), plan: new Standard()).total.toString() == '120.00'
    assert Quote.of(big(), plan: new CouponThenVolume(), coupon: 'WELCOME').total.toString() == '445.50'
}

Spec.test('l\'ordre des traits change le résultat') {
    assert Quote.of(big(), plan: new VolumeThenCoupon(), coupon: 'WELCOME').total.toString() == '444.00'
    assert Quote.of(big(), plan: new CouponThenVolume(), coupon: 'WELCOME').total.toString() == '445.50'
}

Spec.test('plafond fourni par la classe du plan') {
    assert Quote.of(big(), plan: new Capped()).total.toString() == '400.00'
    assert Quote.of(new Seat(2), plan: new Capped()).total.toString() == '24.00'
    assert Quote.of(big(), plan: new CapUnderLoyalty(), customerYears: 5).total.toString() == '90.00'
}

Spec.test('jamais négatif') {
    assert Quote.of(new Ticket(3), plan: new VolumeThenCoupon(), coupon: 'WELCOME').total.toString() == '0.00'
}

Spec.test('sans BasePricing, la chaîne n\'a pas de fin') {
    try { Quote.of(new Seat(1), plan: new Headless()).total; assert false, 'super.adjust n\'existe pas' }
    catch (MissingMethodException e) { }
}

Spec.test('options invalides') {
    [[plan: 'gold'], [customerYears: -1], [customerYears: 'trois'], [coupon: 'FREE'], [cupon: 'WELCOME']].each { opts ->
        try { Quote.of(opts, new Seat(1)); assert false, "$opts doit être refusé" } catch (IllegalArgumentException e) { }
    }
    try { Quote.of(); assert false, 'devis vide' } catch (IllegalArgumentException e) { }
    try { Quote.of(new Seat(1), null); assert false, 'article null' } catch (IllegalArgumentException e) { }
}

Spec.test('la Map d\'options n\'est pas modifiée') {
    def opts = [customerYears: '2']
    Quote.of(opts, new Seat(1))
    assert opts == [customerYears: '2']
}

Spec.test('un devis est non modifiable') {
    def q = Quote.of(new Seat(1), coupon: 'WELCOME', plan: new Standard())
    assert q.customerYears == 0 && q.coupon == 'WELCOME' && q.plan instanceof Standard
    ['items', 'plan', 'customerYears', 'coupon', 'total', 'subtotal', 'lines'].each { prop ->
        try { q."$prop" = null; assert false, "$prop ne doit pas s'écrire" } catch (ReadOnlyPropertyException e) { }
    }
    try { q.items << new Seat(2); assert false, 'items ne doit pas accepter d\'ajout' } catch (UnsupportedOperationException e) { }
    assert q.subtotal == 12.00
}

Spec.done()
