// Le bas de la pile : il termine la chaîne des super.
trait BasePricing {
    BigDecimal adjust(BigDecimal subtotal, Quote quote) { subtotal }
}
