package app;

import org.springframework.stereotype.Component;

/** Verrouille une place ; échoue les « failures » premières fois (concurrence). Fourni. */
@Component
public class SeatLocker {
    private final Trace trace;
    private int failures;
    private int calls;

    public SeatLocker(Trace trace) { this.trace = trace; }

    /** Une méthode, pas un champ public : sur un proxy CGLIB, un champ modifié serait celui du proxy. */
    public void setFailures(int failures) { this.failures = failures; }

    @Booking
    public String lock(String seat) {
        calls++;
        trace.add("lock " + seat + " #" + calls);
        if (calls <= failures) throw new IllegalStateException("place déjà verrouillée");
        return "verrou-" + seat;
    }
}
