package app;

import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Service;

/** Réserve des places (capacité 4 par événement). Fourni : ne pas modifier. */
@Service
public class ReservationService {
    private final Map<String, Integer> sold = new HashMap<>();

    @Audited
    public String reserve(String eventId, int seats) {
        int taken = sold.getOrDefault(eventId, 0);
        if (taken + seats > 4) throw new IllegalStateException("complet");
        sold.put(eventId, taken + seats);
        return eventId + ":" + (taken + 1) + "-" + (taken + seats);
    }
}
