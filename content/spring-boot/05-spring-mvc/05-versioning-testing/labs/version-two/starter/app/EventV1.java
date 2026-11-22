package app;

import java.time.LocalDate;

/** Le contrat de la version 1, utilisé par l'application mobile : il ne doit pas changer. */
public record EventV1(long id, String name, LocalDate date, String city) {
    static EventV1 of(Event e) {
        return new EventV1(e.id(), e.title(), e.startsAt().toLocalDate(), e.city());
    }
}
