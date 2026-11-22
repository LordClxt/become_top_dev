package tixa.metrics;

import java.util.ArrayList;
import java.util.List;

/** La bibliothèque de métriques (optionnelle) : présente seulement si l'application l'ajoute. Fourni. */
public class MeterSink {
    private final List<String> meters = new ArrayList<>();

    public void register(String name) { meters.add(name); }

    public List<String> meters() { return List.copyOf(meters); }
}
