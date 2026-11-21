package app;

import java.util.List;

/** Les événements chargés au démarrage. Fourni : ne pas modifier. */
public final class SeedEvents {
    private SeedEvents() { }

    public static final List<Event> ALL = List.of(
            new Event("jazz-0612", "concert", 4500, 100),
            new Event("rock-0701", "concert", 6000, 2),
            new Event("solidays", "festival", 8000, 1000),
            new Event("expo-1003", "expo", 1500, 50));
}
