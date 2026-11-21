import groovy.transform.EqualsAndHashCode

// Cause racine : `boolean equals(Line other)` SURCHARGEAIT equals(Object) sans le redéfinir.
// Groovy (==, unique()) trouvait la surcharge par dispatch dynamique ; la LinkedHashMap du panier,
// code Java, appelait equals(Object) et hashCode() hérités d'Object : deux claviers = deux clés.
@EqualsAndHashCode(includes = 'sku')
class Line {
    String sku
    String name
    BigDecimal price
    int qty = 1

    String toString() { "$name ×$qty" }
}
