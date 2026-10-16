public final class RomanNumerals {
    private RomanNumerals() { throw new AssertionError(); }

    /** Appelée des millions de fois par seconde par le parseur de documents. */
    public static boolean isRomanNumeral(String s) {
        return s.matches("^(?=.)M*(C[MD]|D?C{0,3})(X[CL]|L?X{0,3})(I[XV]|V?I{0,3})$");
    }
}
