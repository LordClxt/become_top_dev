import java.time.Instant;

/** Jeton de session : identifiant, utilisateur et date d'expiration. */
public record Token(String id, String user, Instant expiresAt) {}
