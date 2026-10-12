import groovy.transform.ToString

class Product {
    String name
    BigDecimal price = 0

    // TODO 1 : setPrice qui refuse un prix négatif (IllegalArgumentException)
    // TODO 2 : getLabel() -> "Tea (3.5 €)"

    Product discounted(int percent) {
        throw new UnsupportedOperationException('à écrire')
    }

    static Product parse(String line) {
        throw new UnsupportedOperationException('à écrire')
    }
}
