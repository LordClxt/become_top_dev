trait LoyaltyDiscount {
    BigDecimal adjust(BigDecimal subtotal, Quote quote) {
        super.adjust(subtotal, quote) * (1 - [quote.customerYears * 0.02, 0.10].min())
    }
}
