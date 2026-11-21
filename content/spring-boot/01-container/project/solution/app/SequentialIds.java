package app;

import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;

/** Identifiants de réservation : R-1, R-2… Fourni : ne pas modifier. */
public class SequentialIds implements Supplier<String> {
    private final AtomicLong next = new AtomicLong();

    @Override
    public String get() { return "R-" + next.incrementAndGet(); }
}
