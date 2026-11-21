package app;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Catalogue des événements en vente (en mémoire pour l'instant). Fourni : ne pas modifier. */
public class EventCatalog {
    private final Map<String, Integer> basePrices = Map.of("jazz-0612", 4500, "rock-0701", 6000);

    public Optional<Integer> basePrice(String eventId) {
        return Optional.ofNullable(basePrices.get(eventId));
    }

    public List<String> eventIds() {
        return basePrices.keySet().stream().sorted().toList();
    }
}
