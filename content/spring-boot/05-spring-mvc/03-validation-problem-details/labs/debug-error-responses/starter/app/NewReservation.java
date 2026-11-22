package app;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

/** Une demande de réservation : 1 à 8 places, un e-mail valide. */
public record NewReservation(
        long eventId,
        @Min(1) @Max(8) int seats,
        @NotBlank @Email String email) { }
