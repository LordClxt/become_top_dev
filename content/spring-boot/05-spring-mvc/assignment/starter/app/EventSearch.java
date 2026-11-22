package app;

import java.time.LocalDate;

/** Les critères de recherche, lus dans les paramètres de la requête. */
public record EventSearch(String city, LocalDate from, LocalDate to, Integer page, Integer size, String sort) { }
