import java.util.List;

/** Le calcul de prix, lent (appel à un service externe en production). Fourni. */
public final class Pricing {
    private int calls;

    public long compute(Sku sku, List<String> options) {
        calls++;
        return 1000L + sku.code().length() * 10L + options.size() * 150L;
    }

    public int calls() {
        return calls;
    }
}
