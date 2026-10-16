import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Un statut HTTP (code + raison). Classe à instances contrôlées : pour un code donné, il n'existe
 * qu'une instance, donc {@code a.equals(b)} équivaut à {@code a == b}.
 */
public final class HttpStatus {
    private static final Map<Integer, String> REASONS = Map.of(
            200, "OK", 201, "Created", 204, "No Content", 301, "Moved Permanently",
            400, "Bad Request", 404, "Not Found", 500, "Internal Server Error");

    private static final Map<Integer, HttpStatus> CACHE = new ConcurrentHashMap<>();

    public static final HttpStatus OK = of(200);
    public static final HttpStatus NOT_FOUND = of(404);

    private final int code;
    private final String reason;

    private HttpStatus(int code, String reason) {
        this.code = code;
        this.reason = reason;
    }

    /** Agrégation : renvoie l'unique instance du code, créée au premier appel. */
    public static HttpStatus of(int code) {
        if (code < 100 || code > 599) {
            throw new IllegalArgumentException("code HTTP hors de [100, 599] : " + code);
        }
        return CACHE.computeIfAbsent(code, c -> new HttpStatus(c, REASONS.getOrDefault(c, "Unknown")));
    }

    /** Conversion : lit une ligne de statut comme {@code "404 Not Found"} ou {@code " 201 "}. */
    public static HttpStatus from(String statusLine) {
        Objects.requireNonNull(statusLine, "statusLine");
        String token = statusLine.strip().split("\\s+", 2)[0];
        try {
            return of(Integer.parseInt(token));
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("ligne de statut illisible : \"" + statusLine + "\"", e);
        }
    }

    public int code() { return code; }

    public String reason() { return reason; }

    public boolean isError() { return code >= 400; }

    @Override public String toString() { return code + " " + reason; }
}
