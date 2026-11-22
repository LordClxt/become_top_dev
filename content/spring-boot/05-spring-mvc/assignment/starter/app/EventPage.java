package app;

import java.util.List;

/** Une page de résultats. */
public record EventPage(List<Event> items, int page, int size, long total) { }
