package app;

import java.time.LocalDateTime;

/** Le modèle interne d'un événement : il ne sort jamais tel quel de l'API. */
public record Event(long id, String title, LocalDateTime startsAt, String venueName, String city) { }
