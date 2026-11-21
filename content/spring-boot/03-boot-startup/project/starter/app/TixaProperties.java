package app;

import java.time.Duration;

/** M1 — la configuration de Tixa (préfixe tixa). */
public record TixaProperties(int feeCents, Duration holdTimeout, String bankUrl) { }
