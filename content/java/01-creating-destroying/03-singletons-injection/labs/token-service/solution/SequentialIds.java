import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;

/** Générateur d'identifiants séquentiels unique pour toute la JVM : un singleton enum. */
public enum SequentialIds implements Supplier<String> {
    INSTANCE;

    private final AtomicLong next = new AtomicLong();

    @Override public String get() {
        return "tok-" + next.incrementAndGet();
    }
}
