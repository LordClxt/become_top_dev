package app;

import java.time.Duration;
import java.util.List;

/** La configuration de Tixa (préfixe tixa). */
public record TixaProperties(String currency, List<String> notifiers, Hold hold) {

    public record Hold(Duration timeout, int maxSeats) { }
}
