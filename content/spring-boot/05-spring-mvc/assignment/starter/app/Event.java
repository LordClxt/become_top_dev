package app;

import java.time.LocalDate;

public record Event(long id, String title, String city, LocalDate date) { }
