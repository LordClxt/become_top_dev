package app;

/** Une demande : eventId, 1 à 8 places, un e-mail valide. */
public record ReservationRequest(Long eventId, Integer seats, String email) { }
