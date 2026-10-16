import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.function.Supplier;

/**
 * Émet et vérifie des jetons de session.
 * Version actuelle : l'heure et les identifiants sont câblés en dur, donc impossible de tester
 * l'expiration sans attendre 15 minutes. TODO : injecter les dépendances.
 */
public class TokenService {
    public static final Duration TTL = Duration.ofMinutes(15);

    private static long counter = 0;

    /**
     * L'horloge et le fournisseur d'identifiants sont fournis par l'appelant.
     * null : NullPointerException.
     */
    public TokenService(Clock clock, Supplier<String> ids) {
        // TODO : garder les dépendances.
    }

    /** Service de production : horloge système UTC et SequentialIds.INSTANCE. */
    public static TokenService system() {
        throw new UnsupportedOperationException("system à écrire");
    }

    /** Nouveau jeton : identifiant suivant, expiration = maintenant + TTL. user null : NullPointerException. */
    public Token issue(String user) {
        return new Token("tok-" + (++counter), user, Instant.now().plus(TTL));
    }

    /** Un jeton est valide tant que maintenant est strictement avant son expiration. */
    public boolean isValid(Token token) {
        return Instant.now().isBefore(token.expiresAt());
    }
}
