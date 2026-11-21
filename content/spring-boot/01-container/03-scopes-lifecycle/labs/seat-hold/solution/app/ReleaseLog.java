package app;

import java.util.ArrayList;
import java.util.List;

/** Journal des libérations, lu par l'équipe support. Fourni : ne pas modifier. */
public class ReleaseLog {
    private final List<String> lines = new ArrayList<>();

    public synchronized void add(String line) { lines.add(line); }

    public synchronized List<String> lines() { return List.copyOf(lines); }
}
