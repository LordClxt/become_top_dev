package app;

import java.util.ArrayList;
import java.util.List;

import jakarta.annotation.PreDestroy;

/** Tampon des réservations, écrit dans le JournalSink par lots de 3 (M2). */
public class ReservationJournal {
    private static final int BATCH = 3;
    private final JournalSink sink;
    private final List<String> buffer = new ArrayList<>();

    public ReservationJournal(JournalSink sink) {
        this.sink = sink;
    }

    public synchronized void record(Reservation r) {
        buffer.add(r.id() + ";" + r.eventId() + ";" + r.seats() + ";" + r.totalCents());
        if (buffer.size() == BATCH) flush();
    }

    // À l'arrêt : vidé avant que le support ne ferme, car le journal dépend du support (ordre de destruction).
    @PreDestroy
    public synchronized void flush() {
        if (buffer.isEmpty()) return;
        sink.write(List.copyOf(buffer));
        buffer.clear();
    }
}
