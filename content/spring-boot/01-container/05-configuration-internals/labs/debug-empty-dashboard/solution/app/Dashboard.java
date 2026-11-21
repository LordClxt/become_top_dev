package app;

/** Le tableau de bord des organisateurs : places vendues par événement. */
public class Dashboard {
    private final ReservationStore store;

    public Dashboard(ReservationStore store) {
        this.store = store;
    }

    // Lecture à chaque appel : une copie prise au démarrage (@PostConstruct) ne voit jamais les ventes suivantes.
    public int soldSeats(String eventId) {
        return store.snapshot().getOrDefault(eventId, 0);
    }
}
