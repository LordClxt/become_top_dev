package app;

import java.time.Duration;

import jakarta.validation.constraints.Min;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

/** La configuration de Tixa (préfixe tixa). L'URL de la banque n'est exigée que par LiveBank. */
@ConfigurationProperties("tixa")
@Validated
public record TixaProperties(
        @DefaultValue("150") @Min(0) int feeCents,
        @DefaultValue("15m") Duration holdTimeout,
        String bankUrl) { }
