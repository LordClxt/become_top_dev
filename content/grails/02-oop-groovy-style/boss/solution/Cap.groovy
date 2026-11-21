// Le trait exige un plafond : c'est la classe du plan qui le fournit.
trait Cap {
    abstract BigDecimal getCap()

    BigDecimal adjust(BigDecimal subtotal, Quote quote) {
        [super.adjust(subtotal, quote), cap].min()
    }
}
