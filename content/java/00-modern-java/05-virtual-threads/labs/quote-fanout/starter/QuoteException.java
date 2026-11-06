/** Échec d'une cotation. NE PAS MODIFIER. */
final class QuoteException extends RuntimeException {
    QuoteException(String symbol, Throwable cause) {
        super("cotation impossible pour " + symbol, cause);
    }
}
