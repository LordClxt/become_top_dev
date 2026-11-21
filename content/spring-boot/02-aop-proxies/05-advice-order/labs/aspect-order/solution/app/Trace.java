package app;

import java.util.ArrayList;
import java.util.List;

/** Le fil des événements, lu par les tests. Fourni. */
public class Trace {
    private final List<String> events = new ArrayList<>();

    public synchronized void add(String e) { events.add(e); }

    public synchronized List<String> events() { return List.copyOf(events); }
}
