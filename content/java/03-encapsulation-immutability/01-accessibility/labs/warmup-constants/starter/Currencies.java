import java.util.Arrays;

/** Les devises acceptées par le paiement. */
public final class Currencies {
    private Currencies() { throw new AssertionError(); }

    public static final String[] CODES = {"EUR", "USD", "GBP", "CHF", "JPY"};

    public static boolean isAccepted(String code) {
        return Arrays.asList(CODES).contains(code);
    }
}
