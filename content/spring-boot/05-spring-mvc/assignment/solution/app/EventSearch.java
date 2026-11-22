package app;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDate;

/**
 * Les critères de recherche, liés aux paramètres de la requête (@ModelAttribute implicite) et validés d'un bloc.
 * Les valeurs par défaut sont appliquées dans le constructeur compact : un paramètre absent arrive à null.
 */
public record EventSearch(
        String city,
        LocalDate from,
        LocalDate to,
        @Min(0) Integer page,
        @Min(1) @Max(50) Integer size,
        @Pattern(regexp = "date|title", message = "tri possible : date ou title") String sort) {

    public EventSearch {
        page = page == null ? 0 : page;
        size = size == null ? 20 : size;
        sort = sort == null ? "date" : sort;
    }

    /** Une contrainte sur plusieurs champs : la période doit être dans le bon ordre. */
    @AssertTrue(message = "from doit précéder to")
    public boolean isPeriodValid() {
        return from == null || to == null || !from.isAfter(to);
    }
}
