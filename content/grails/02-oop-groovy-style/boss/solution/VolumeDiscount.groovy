trait VolumeDiscount {
    BigDecimal adjust(BigDecimal subtotal, Quote quote) {
        BigDecimal amount = super.adjust(subtotal, quote)
        subtotal >= 500.00 ? amount * 0.90 : amount
    }
}
