package app;

/** Assemble les proxies de Tixa. */
public final class Chains {
    private Chains() { }

    /**
     * Un proxy de target qui réessaie les méthodes @Retry et mesure chaque appel UNE fois,
     * retries compris (« NomSimple.méthode durée »).
     */
    public static <T> T resilient(T target, Ticker ticker, Metrics metrics) {
        throw new UnsupportedOperationException("Chains.resilient");
    }
}
