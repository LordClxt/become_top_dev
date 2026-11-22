package tixa.client;

/** Le client de l'API Tixa, livré dans une bibliothèque. Fourni : ne pas modifier. */
public class TixaClient {
    private final String baseUrl;

    public TixaClient(String baseUrl) { this.baseUrl = baseUrl; }

    public String baseUrl() { return baseUrl; }
}
