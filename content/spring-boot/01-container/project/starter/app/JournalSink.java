package app;

import java.util.ArrayList;
import java.util.List;

import jakarta.annotation.PreDestroy;

/** Le support du journal (en vrai : un fichier, un bucket). Refuse toute écriture une fois fermé. Fourni. */
public class JournalSink {
    private final List<String> lines = new ArrayList<>();
    private boolean closed;

    public synchronized void write(List<String> batch) {
        if (closed) throw new IllegalStateException("journal fermé : " + batch.size() + " lignes perdues");
        lines.addAll(batch);
    }

    public synchronized List<String> lines() { return List.copyOf(lines); }

    public synchronized boolean isClosed() { return closed; }

    @PreDestroy
    public synchronized void close() { closed = true; }
}
