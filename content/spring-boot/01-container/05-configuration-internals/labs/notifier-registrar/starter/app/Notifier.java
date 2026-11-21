package app;

/** Un canal de notification client. Fourni : ne pas modifier. */
public interface Notifier {
    String send(String to, String message);
}
