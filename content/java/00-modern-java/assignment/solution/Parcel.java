import java.util.Objects;

/** Un colis à expédier. NE PAS MODIFIER. */
record Parcel(String id, int grams, Zone zone, boolean fragile) {
    Parcel {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(zone, "zone");
        if (grams <= 0) throw new IllegalArgumentException("poids : " + grams);
    }
}
