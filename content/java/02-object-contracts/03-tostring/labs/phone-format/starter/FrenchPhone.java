/** Un numéro de téléphone français à 10 chiffres. */
public final class FrenchPhone {
    private final String digits; // 10 chiffres, commence par 0

    private FrenchPhone(String digits) {
        this.digits = digits;
    }

    /** TODO : accepte "0612345678", "06.12.34.56.78", "06 12 34 56 78", "+33 6 12 34 56 78". */
    public static FrenchPhone parse(String text) {
        throw new UnsupportedOperationException("parse à écrire");
    }

    // TODO : accesseurs digits() et isMobile(), toString au format spécifié.

    @Override
    public boolean equals(Object o) {
        return o instanceof FrenchPhone p && p.digits.equals(digits);
    }

    @Override
    public int hashCode() {
        return digits.hashCode();
    }
}
