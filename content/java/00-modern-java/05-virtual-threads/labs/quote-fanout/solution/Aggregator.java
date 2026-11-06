import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.SequencedMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.Semaphore;

/** Agrège les cotations d'un portefeuille. */
final class Aggregator {
    /** Identifiant de la requête en cours, lu par le fournisseur. */
    static final ScopedValue<String> REQUEST_ID = ScopedValue.newInstance();

    private final QuoteProvider provider;
    private final Semaphore permits;   // la limite du contrat porte sur le fournisseur, pas sur les threads

    Aggregator(QuoteProvider provider, int maxConcurrent) {
        if (maxConcurrent <= 0) throw new IllegalArgumentException("maxConcurrent : " + maxConcurrent);
        this.provider = provider;
        this.permits = new Semaphore(maxConcurrent);
    }

    SequencedMap<String, Long> quoteAll(String requestId, List<String> symbols) {
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {   // close() attend toutes les tâches
            List<Future<Long>> futures = new ArrayList<>(symbols.size());
            for (String symbol : symbols) {
                // Une ScopedValue ne traverse pas un executor : on la relie dans chaque tâche.
                futures.add(executor.submit(() -> ScopedValue.where(REQUEST_ID, requestId).call(() -> limited(symbol))));
            }
            SequencedMap<String, Long> prices = new LinkedHashMap<>();
            for (int i = 0; i < symbols.size(); i++) {
                String symbol = symbols.get(i);
                try {
                    prices.put(symbol, futures.get(i).get());
                } catch (ExecutionException e) {
                    futures.forEach(f -> f.cancel(true));   // inutile d'attendre les autres
                    throw new QuoteException(symbol, e.getCause());
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new QuoteException(symbol, e);
                }
            }
            return prices;
        }
    }

    private long limited(String symbol) throws Exception {
        permits.acquire();
        try {
            return provider.quote(symbol);
        } finally {
            permits.release();
        }
    }
}
