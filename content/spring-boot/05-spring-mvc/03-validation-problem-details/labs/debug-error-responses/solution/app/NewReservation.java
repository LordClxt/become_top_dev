package app;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Une demande de réservation : 1 à 8 places, un e-mail valide.
 * Integer plutôt que int : un champ absent devient une erreur de validation qui le nomme,
 * pas un échec de lecture du JSON (Jackson 3 refuse null pour un primitif).
 */
public record NewReservation(
        long eventId,
        @NotNull @Min(1) @Max(8) Integer seats,
        @NotBlank @Email String email) { }
