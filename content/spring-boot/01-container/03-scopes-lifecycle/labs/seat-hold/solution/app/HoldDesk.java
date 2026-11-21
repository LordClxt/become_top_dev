package app;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.ObjectProvider;

import jakarta.annotation.PreDestroy;

/** Le guichet : ouvre une réservation temporaire par client. Un seul guichet dans l'application. */
public class HoldDesk {
    private final ObjectProvider<SeatHold> holds;
    private final ReleaseLog log;
    // Le conteneur oublie les prototypes dès qu'il les a créés : c'est à nous de les suivre.
    private final List<SeatHold> open = new ArrayList<>();

    public HoldDesk(ObjectProvider<SeatHold> holds, ReleaseLog log) {
        this.holds = holds;
        this.log = log;
    }

    /** Une nouvelle réservation, vide, pour un nouveau client. */
    public synchronized SeatHold open() {
        SeatHold hold = holds.getObject();
        open.add(hold);
        return hold;
    }

    /** À l'arrêt : le @PreDestroy de SeatHold n'est jamais appelé pour un prototype, on libère nous-mêmes. */
    @PreDestroy
    public synchronized void releaseAll() {
        open.forEach(SeatHold::release);
        log.add(open.size() + " réservations libérées");
        open.clear();
    }
}
