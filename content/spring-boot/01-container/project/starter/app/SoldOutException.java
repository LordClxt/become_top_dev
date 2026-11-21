package app;

/** Plus assez de places. Fourni : ne pas modifier. */
public class SoldOutException extends RuntimeException {
    public SoldOutException(String eventId, int remaining) {
        super("complet : " + eventId + " (" + remaining + " places restantes)");
    }
}
