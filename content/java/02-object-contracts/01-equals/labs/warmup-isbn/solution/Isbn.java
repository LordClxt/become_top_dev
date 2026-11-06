/** Un ISBN-13, normalisé sans tirets ni espaces. */
public final class Isbn {
    private final String digits;

    private Isbn(String digits) {
        this.digits = digits;
    }

    public static Isbn parse(String text) {
        String d = text.replace("-", "").replace(" ", "");
        if (!d.matches("\\d{13}")) throw new IllegalArgumentException("ISBN-13 invalide : " + text);
        return new Isbn(d);
    }

    public String digits() {
        return digits;
    }

    @Override
    public boolean equals(Object o) {
        return o == this || (o instanceof Isbn other && other.digits.equals(digits));
    }

    /** Fourni : cohérent avec equals (voir la leçon sur hashCode). */
    @Override
    public int hashCode() {
        return digits.hashCode();
    }
}
