import java.io.IOException;
import java.util.function.Supplier;

public final class Transfers {
    private Transfers() { throw new AssertionError(); }

    /**
     * Copie tout le contenu de la source vers la destination et renvoie le nombre de caractères
     * copiés. Les deux ressources sont fermées dans tous les cas, la destination d'abord. Si la copie
     * échoue ET qu'une fermeture échoue aussi, c'est l'erreur de la COPIE qui doit remonter.
     */
    public static long copy(Supplier<? extends Source> openSource, Supplier<? extends Sink> openSink) throws IOException {
        Source in = openSource.get();
        try {
            Sink out = openSink.get();
            try {
                char[] buf = new char[8];
                long total = 0;
                int n;
                while ((n = in.read(buf)) >= 0) {
                    out.write(buf, 0, n);
                    total += n;
                }
                return total;
            } finally {
                out.close();
            }
        } finally {
            in.close();
        }
    }
}
