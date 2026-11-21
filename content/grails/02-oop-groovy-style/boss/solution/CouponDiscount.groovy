trait CouponDiscount {
    BigDecimal adjust(BigDecimal subtotal, Quote quote) {
        super.adjust(subtotal, quote) - (quote.coupon ? Quote.COUPONS[quote.coupon] : 0.00)
    }
}
