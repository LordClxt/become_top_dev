import java.io.IOException;
import java.util.List;

/** Support d'écriture du journal (fichier, réseau…). Fourni. */
public interface Sink extends AutoCloseable {
    void write(List<String> lines) throws IOException;

    @Override
    void close() throws IOException;
}
