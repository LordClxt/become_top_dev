package tixa.notify;

/** Un canal de notification. Fourni : ne pas modifier. */
public interface Notifier {
    String notify(String to, String text);
}
