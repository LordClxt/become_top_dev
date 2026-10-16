import java.util.regex.Pattern;

public final class RomanNumerals {
    // Compiler une regex construit un automate : on le fait une fois, à l'initialisation de la classe.
    private static final Pattern ROMAN = Pattern.compile(
            "^(?=.)M*(C[MD]|D?C{0,3})(X[CL]|L?X{0,3})(I[XV]|V?I{0,3})$");

    private RomanNumerals() { throw new AssertionError(); }

    public static boolean isRomanNumeral(String s) {
        return ROMAN.matcher(s).matches();
    }
}
