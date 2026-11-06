/** Un numéro de téléphone français à 10 chiffres. */
public final class FrenchPhone {
    private final String digits; // 10 chiffres, commence par 0

    private FrenchPhone(String digits) {
        this.digits = digits;
    }

    /**
     * Lit un numéro : chiffres éventuellement séparés par des espaces, points ou tirets, avec 0 initial
     * ou indicatif +33. Accepte en particulier la sortie de {@link #toString()}.
     *
     * @throws IllegalArgumentException si le texte n'est pas un numéro français à 10 chiffres
     */
    public static FrenchPhone parse(String text) {
        String d = text.replaceAll("[ .\\-]", "");
        if (d.startsWith("+33")) d = "0" + d.substring(3);
        if (!d.matches("0\\d{9}")) throw new IllegalArgumentException("numéro invalide : \"" + text + "\"");
        return new FrenchPhone(d);
    }

    /** Les 10 chiffres, sans séparateur (« 0612345678 »). */
    public String digits() { return digits; }

    /** Vrai pour un mobile (06 ou 07). */
    public boolean isMobile() { return digits.startsWith("06") || digits.startsWith("07"); }

    /**
     * Renvoie ce numéro au format « XX XX XX XX XX » : dix chiffres groupés par deux, séparés par une
     * espace (14 caractères, par exemple « 06 12 34 56 78 »). Ce format est garanti et
     * {@link #parse(String)} le relit.
     */
    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder(14);
        for (int i = 0; i < 10; i += 2) {
            if (i > 0) sb.append(' ');
            sb.append(digits, i, i + 2);
        }
        return sb.toString();
    }

    @Override
    public boolean equals(Object o) {
        return o instanceof FrenchPhone p && p.digits.equals(digits);
    }

    @Override
    public int hashCode() {
        return digits.hashCode();
    }
}
