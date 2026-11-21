package app;

import java.util.Map;

import jakarta.annotation.PostConstruct;

/** Le tableau de bord des organisateurs : places vendues par événement. */
public class Dashboard {
    private final ReservationStore store;
    private Map<String, Integer> sold = Map.of();

    public Dashboard(ReservationStore store) {
        this.store = store;
    }

    // Charger les chiffres une fois pour toutes : l'écran est consulté très souvent.
    @PostConstruct
    void load() {
        sold = store.snapshot();
    }

    public int soldSeats(String eventId) {
        return sold.getOrDefault(eventId, 0);
    }
}
