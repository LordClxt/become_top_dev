package app;

import java.util.ArrayList;
import java.util.List;

import jakarta.annotation.PreDestroy;

/** Places bloquées pour un client pendant qu'il paie. Une par client. Fourni : ne pas modifier. */
public class SeatHold {
    private final List<String> seats = new ArrayList<>();
    private boolean released;

    public void hold(String seat) {
        if (released) throw new IllegalStateException("réservation déjà libérée");
        seats.add(seat);
    }

    public List<String> seats() { return List.copyOf(seats); }

    public boolean isReleased() { return released; }

    /** Rend les places à la vente. */
    @PreDestroy
    public void release() {
        released = true;
    }
}
