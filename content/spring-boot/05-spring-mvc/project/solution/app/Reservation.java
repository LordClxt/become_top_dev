package app;

public record Reservation(long id, long eventId, String customerId, int seats, String email) { }
