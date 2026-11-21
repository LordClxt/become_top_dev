package app;

import java.util.ArrayList;
import java.util.List;

/** Les mesures enregistrées : « Classe.méthode durée_en_ms ». Fourni : ne pas modifier. */
public class Metrics {
    private final List<String> lines = new ArrayList<>();

    public synchronized void record(String method, long millis) { lines.add(method + " " + millis); }

    public synchronized List<String> lines() { return List.copyOf(lines); }
}
