package app;

import java.util.ArrayList;
import java.util.List;

/** Les mesures : « métrique résultat durée », résultat = ok ou erreur. Fourni : ne pas modifier. */
public class Metrics {
    private final List<String> lines = new ArrayList<>();

    public synchronized void record(String metric, String outcome, long millis) { lines.add(metric + " " + outcome + " " + millis); }

    public synchronized List<String> lines() { return List.copyOf(lines); }
}
