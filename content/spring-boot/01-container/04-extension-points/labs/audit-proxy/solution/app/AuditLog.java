package app;

import java.util.ArrayList;
import java.util.List;

/** Journal d'audit. Fourni : ne pas modifier. */
public class AuditLog {
    private final List<String> entries = new ArrayList<>();

    public synchronized void record(String entry) { entries.add(entry); }

    public synchronized List<String> entries() { return List.copyOf(entries); }
}
