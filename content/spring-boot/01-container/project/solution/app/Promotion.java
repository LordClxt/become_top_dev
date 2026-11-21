package app;

/** Un code promo : pourcentage de remise sur le total. Fourni : ne pas modifier. */
public record Promotion(String code, int percent) {
    public int apply(int totalCents) { return totalCents * (100 - percent) / 100; }
}
