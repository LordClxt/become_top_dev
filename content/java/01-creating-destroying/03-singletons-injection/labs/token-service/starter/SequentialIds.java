import java.util.function.Supplier;

/**
 * Générateur d'identifiants "tok-1", "tok-2"… unique pour toute la JVM.
 * TODO : en faire un singleton robuste (une seule instance, même face à la réflexion ou à la
 * sérialisation) qui implémente Supplier<String>.
 */
public class SequentialIds implements Supplier<String> {
    public static final SequentialIds INSTANCE = new SequentialIds();

    private long next = 0;

    @Override public String get() {
        throw new UnsupportedOperationException("get à écrire");
    }
}
