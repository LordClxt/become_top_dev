import java.io.IOException;

/** Un journal qui compte les ordres enregistrés, par symbole, en enveloppant un autre journal. */
public final class CountingJournal implements Journal {

    public CountingJournal(Journal inner) {
    }

    /** Nombre d'ordres enregistrés pour ce symbole depuis la création. */
    public int count(String symbol) {
        throw new UnsupportedOperationException("count");
    }

    /** Nombre total d'ordres enregistrés depuis la création. */
    public int total() {
        throw new UnsupportedOperationException("total");
    }

    @Override
    public void record(Order order) throws IOException {
        throw new UnsupportedOperationException("record");
    }

    @Override
    public void flush() throws IOException {
        throw new UnsupportedOperationException("flush");
    }

    @Override
    public void close() throws IOException {
        throw new UnsupportedOperationException("close");
    }
}
