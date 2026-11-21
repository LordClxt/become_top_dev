package app;

import java.time.Duration;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/** La configuration de Tixa (préfixe tixa), liée par constructeur et validée au démarrage. */
@ConfigurationProperties("tixa")
@Validated
public record TixaProperties(
        @DefaultValue("EUR") @Pattern(regexp = "[A-Z]{3}") String currency,
        @DefaultValue List<String> notifiers,
        @DefaultValue @Valid Hold hold) {

    // @Valid : sans lui, les contraintes de Hold ne sont pas vérifiées.
    public record Hold(
            @DefaultValue("15m") @NotNull Duration timeout,
            @DefaultValue("6") @Min(1) @Max(10) int maxSeats) { }
}
