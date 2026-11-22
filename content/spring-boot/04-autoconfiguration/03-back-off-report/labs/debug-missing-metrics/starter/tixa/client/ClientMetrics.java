package tixa.client;

/** Les métriques d'appels du client, affichées sur le tableau de bord. */
public class ClientMetrics {
    private final TixaClient client;

    public ClientMetrics(TixaClient client) { this.client = client; }

    public String describe() { return "métriques de " + client.getClass().getSimpleName(); }
}
