import groovy.transform.ToString

@ToString(includeNames = true, excludes = 'label')
class Product {
    String name
    BigDecimal price = 0

    void setPrice(BigDecimal value) {
        if (value < 0) throw new IllegalArgumentException("prix négatif : ${value}")
        this.@price = value
    }

    String getLabel() { "${name} (${price} €)" }

    Product discounted(int percent) {
        new Product(name: name, price: price * (100 - percent) / 100)
    }

    static Product parse(String line) {
        def (n, p) = line.split(':')*.trim()
        new Product(name: n, price: p as BigDecimal)
    }
}
