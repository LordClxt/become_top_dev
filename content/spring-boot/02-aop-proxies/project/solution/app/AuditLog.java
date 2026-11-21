package app;

import java.util.ArrayList;
import java.util.List;

/** Le journal d'audit lu par le support. Fourni : ne pas modifier. */
public class AuditLog {
    private final List<String> lines = new ArrayList<>();

    public synchronized void add(String line) { lines.add(line); }

    public synchronized List<String> lines() { return List.copyOf(lines); }
}
