import java.util.List;

/** Les devises acceptées par le paiement. */
public final class Currencies {
    private Currencies() { throw new AssertionError(); }

    private static final String[] PRIVATE_CODES = {"EUR", "USD", "GBP", "CHF", "JPY"};

    /** Les codes acceptés, dans une liste non modifiable. */
    public static final List<String> CODES = List.of(PRIVATE_CODES);

    /** Une copie des codes : le tableau renvoyé appartient à l'appelant. */
    public static String[] codesArray() {
        return PRIVATE_CODES.clone();
    }

    public static boolean isAccepted(String code) {
        return CODES.contains(code);
    }
}
