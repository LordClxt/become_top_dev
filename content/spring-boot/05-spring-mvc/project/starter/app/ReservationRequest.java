package app;

/** Une demande de réservation : 1 à 8 places, un e-mail valide. */
public record ReservationRequest(Integer seats, String email) { }
