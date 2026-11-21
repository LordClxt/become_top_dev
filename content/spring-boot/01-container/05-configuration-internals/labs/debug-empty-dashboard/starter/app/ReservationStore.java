package app;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Les places vendues, par événement. */
public class ReservationStore {
    private final Map<String, Integer> sold = new ConcurrentHashMap<>();

    public void add(String eventId, int seats) {
        sold.merge(eventId, seats, Integer::sum);
    }

    public Map<String, Integer> snapshot() {
        return Map.copyOf(sold);
    }

    public int total() {
        return sold.values().stream().mapToInt(Integer::intValue).sum();
    }
}
