import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.function.Supplier;

/** Émet et vérifie des jetons de session. Ses dépendances sont injectées : il se teste sans attendre. */
public final class TokenService {
    public static final Duration TTL = Duration.ofMinutes(15);

    private final Clock clock;
    private final Supplier<String> ids;

    public TokenService(Clock clock, Supplier<String> ids) {
        this.clock = Objects.requireNonNull(clock, "clock");
        this.ids = Objects.requireNonNull(ids, "ids");
    }

    /** Service de production : horloge système UTC et identifiants séquentiels. */
    public static TokenService system() {
        return new TokenService(Clock.systemUTC(), SequentialIds.INSTANCE);
    }

    public Token issue(String user) {
        Objects.requireNonNull(user, "user");
        return new Token(ids.get(), user, clock.instant().plus(TTL));
    }

    public boolean isValid(Token token) {
        return clock.instant().isBefore(token.expiresAt());
    }
}
