package app;

import java.time.Instant;

/** Une réservation confirmée. Fourni : ne pas modifier. */
public record Reservation(String id, String eventId, String customer, int seats, int totalCents, Instant createdAt) { }
