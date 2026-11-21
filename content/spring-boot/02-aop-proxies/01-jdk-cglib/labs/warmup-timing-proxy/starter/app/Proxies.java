package app;

/** Fabrique des proxies qui mesurent la durée de chaque appel. */
public final class Proxies {
    private Proxies() { }

    /** Un proxy de target qui enregistre « NomSimpleDeLaClasse.méthode durée » dans metrics après chaque appel. */
    public static <T> T timed(T target, Ticker ticker, Metrics metrics) {
        throw new UnsupportedOperationException("Proxies.timed");
    }
}
