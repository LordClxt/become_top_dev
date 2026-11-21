class Cart {
    // Ligne → quantité, dans l'ordre d'ajout.
    private final Map<Line, Integer> quantities = new LinkedHashMap<>()

    void add(Line line) {
        Integer current = quantities.get(line)
        quantities.put(line, (current ?: 0) + line.qty)
    }

    void remove(String sku) {
        quantities.remove(new Line(sku: sku))
    }

    List<Line> lines() {
        quantities.collect { line, qty -> new Line(sku: line.sku, name: line.name, price: line.price, qty: qty) }
    }

    BigDecimal total() {
        quantities.collect { line, qty -> line.price * qty }.sum(0.0) as BigDecimal
    }
}
