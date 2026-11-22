package app;

import java.time.LocalDateTime;

/** Le contrat de la version 2 : un titre, un horodatage complet et un lieu structuré. */
public record EventV2(long id, String title, LocalDateTime startsAt, Venue venue) {
    public record Venue(String name, String city) { }

    static EventV2 of(Event e) {
        return new EventV2(e.id(), e.title(), e.startsAt(), new Venue(e.venueName(), e.city()));
    }
}
