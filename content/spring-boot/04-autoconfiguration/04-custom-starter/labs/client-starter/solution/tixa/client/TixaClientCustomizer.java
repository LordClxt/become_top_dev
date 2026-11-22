package tixa.client;

/** Permet à une application d'ajuster le client sans le remplacer. Fourni : ne pas modifier. */
@FunctionalInterface
public interface TixaClientCustomizer {
    void customize(TixaClient.Builder builder);
}
