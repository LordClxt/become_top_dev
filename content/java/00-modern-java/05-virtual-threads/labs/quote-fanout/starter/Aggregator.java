import java.util.LinkedHashMap;
import java.util.List;
import java.util.SequencedMap;

/** Agrège les cotations d'un portefeuille. */
final class Aggregator {
    /** Identifiant de la requête en cours, lu par le fournisseur. */
    static final ScopedValue<String> REQUEST_ID = ScopedValue.newInstance();

    private final QuoteProvider provider;
    private final int maxConcurrent;

    Aggregator(QuoteProvider provider, int maxConcurrent) {
        if (maxConcurrent <= 0) throw new IllegalArgumentException("maxConcurrent : " + maxConcurrent);
        this.provider = provider;
        this.maxConcurrent = maxConcurrent;
    }

    SequencedMap<String, Long> quoteAll(String requestId, List<String> symbols) {
        // TODO : un thread virtuel par appel, au plus maxConcurrent appels simultanés, REQUEST_ID lié
        SequencedMap<String, Long> prices = new LinkedHashMap<>();
        for (String symbol : symbols) {
            try {
                prices.put(symbol, provider.quote(symbol));
            } catch (Exception e) {
                throw new QuoteException(symbol, e);
            }
        }
        return prices;
    }
}
