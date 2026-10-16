import java.io.IOException;

/** Destination de caractères qu'il faut fermer. */
public interface Sink extends AutoCloseable {
    void write(char[] buf, int off, int len) throws IOException;

    @Override void close() throws IOException;
}
