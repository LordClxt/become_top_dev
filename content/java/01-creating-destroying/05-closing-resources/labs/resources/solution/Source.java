import java.io.IOException;

/** Source de caractères qu'il faut fermer. */
public interface Source extends AutoCloseable {
    /** Lit au plus buf.length caractères ; renvoie -1 à la fin. */
    int read(char[] buf) throws IOException;

    @Override void close() throws IOException;
}
