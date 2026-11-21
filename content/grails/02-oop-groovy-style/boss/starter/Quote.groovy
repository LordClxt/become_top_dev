class Quote {
    static final Map<String, BigDecimal> COUPONS = [WELCOME: 15.00]

    List<Item> items = []

    static Quote of(Map opts = [:], Item... items) {
        // TODO
        new Quote(items: items as List)
    }

    BigDecimal getSubtotal() { 0.00 }   // TODO
    BigDecimal getTotal() { 0.00 }      // TODO
    List<Map> getLines() { [] }         // TODO
}
