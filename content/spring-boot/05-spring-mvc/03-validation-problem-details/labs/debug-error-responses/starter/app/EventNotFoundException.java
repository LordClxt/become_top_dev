package app;

public class EventNotFoundException extends RuntimeException {
    private final long eventId;

    public EventNotFoundException(long eventId) {
        super("Aucun événement " + eventId);
        this.eventId = eventId;
    }

    public long eventId() {
        return eventId;
    }
}
