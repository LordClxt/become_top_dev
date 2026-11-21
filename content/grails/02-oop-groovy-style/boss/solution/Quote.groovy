import java.math.RoundingMode

final class Quote {
    static final Map<String, BigDecimal> COUPONS = [WELCOME: 15.00].asImmutable()
    private static final Set<String> OPTIONS = ['plan', 'customerYears', 'coupon'] as Set
    private static final Pricer PRICER = new Pricer()

    final List<Item> items
    final Object plan
    final int customerYears
    final String coupon

    private Quote(List<Item> items, Object plan, int customerYears, String coupon) {
        this.items = items.asImmutable()
        this.plan = plan
        this.customerYears = customerYears
        this.coupon = coupon
    }

    static Quote of(Map opts = [:], Item... items) {
        def unknown = opts.keySet() - OPTIONS
        if (unknown) throw new IllegalArgumentException("options inconnues : ${unknown.sort()}")
        if (!items) throw new IllegalArgumentException('devis vide')
        if (items.any { it == null }) throw new IllegalArgumentException('article manquant')
        def plan = opts.plan
        if (plan != null && !plan.respondsTo('adjust', BigDecimal, Quote)) {
            throw new IllegalArgumentException("plan invalide : ${plan.getClass().simpleName} ne sait pas faire adjust")
        }
        String coupon = opts.coupon
        if (coupon != null && !COUPONS.containsKey(coupon)) throw new IllegalArgumentException("coupon inconnu : $coupon")
        new Quote(items as List, plan, years(opts.customerYears), coupon)
    }

    BigDecimal getSubtotal() {
        lines.sum(0.00) { it.price }.setScale(2, RoundingMode.HALF_EVEN)
    }

    BigDecimal getTotal() {
        BigDecimal base = subtotal
        BigDecimal t = plan == null ? base : plan.adjust(base, this)
        [t, 0.00].max().setScale(2, RoundingMode.HALF_EVEN)
    }

    List<Map> getLines() {
        items.collect { [item: it.getClass().simpleName, price: PRICER.price(it)] }
    }

    private static int years(value) {
        if (value == null) return 0
        String s = value.toString().trim()
        if (!s.isInteger() || s.toInteger() < 0) throw new IllegalArgumentException("customerYears invalide : $value")
        s.toInteger()
    }
}
