## Hint 1
Garde les deux dépendances dans des champs `private final`, vérifiées avec `Objects.requireNonNull`. Partout où le code appelait `Instant.now()`, demande l'heure à l'horloge (`clock.instant()`) ; partout où il incrémentait le compteur, appelle le `Supplier`.

## Hint 2
« Strictement avant l'expiration » : `clock.instant().isBefore(token.expiresAt())`. À l'instant exact de l'expiration, `isBefore` renvoie `false`, ce qui est voulu.

## Hint 3
Un singleton enum s'écrit `public enum SequentialIds implements Supplier<String> { INSTANCE; ... }`. Pour un compteur sûr entre threads, utilise un champ `private final AtomicLong` et `incrementAndGet()`. `system()` n'est qu'un `return new TokenService(Clock.systemUTC(), SequentialIds.INSTANCE);`.
