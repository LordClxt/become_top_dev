package app;

import java.time.LocalDateTime;

/** Modèle interne : il ne sort jamais tel quel de l'API. */
public record Event(long id, String title, LocalDateTime startsAt, String venueName, String city, int seatsLeft) { }
