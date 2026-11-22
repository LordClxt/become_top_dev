package app;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ReservationRequest(@NotNull Long eventId, @NotNull @Min(1) @Max(8) Integer seats, @NotBlank @Email String email) { }
