package app;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Les contrats publics d'un événement, version 1 et version 2. */
public final class EventView {
    private EventView() { }

    public record V1(long id, String name, LocalDate date, String city, int seatsLeft) {
        static V1 of(Event e) {
            return new V1(e.id(), e.title(), e.startsAt().toLocalDate(), e.city(), e.seatsLeft());
        }
    }

    public record V2(long id, String title, LocalDateTime startsAt, Venue venue, int seatsLeft) {
        public record Venue(String name, String city) { }

        static V2 of(Event e) {
            return new V2(e.id(), e.title(), e.startsAt(), new Venue(e.venueName(), e.city()), e.seatsLeft());
        }
    }
}
