class Line {
    String sku
    String name
    BigDecimal price
    int qty = 1

    // Deux lignes sont le même article si elles ont le même sku.
    boolean equals(Line other) {
        other != null && sku == other.sku
    }

    String toString() { "$name ×$qty" }
}
