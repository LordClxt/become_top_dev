import java.util.Map;

/**
 * Un statut HTTP (code + raison). Classe à instances contrôlées : pour un code donné, il ne doit
 * exister qu'une instance, donc {@code a.equals(b)} équivaut à {@code a == b}.
 */
public class HttpStatus {
    private static final Map<Integer, String> REASONS = Map.of(
            200, "OK", 201, "Created", 204, "No Content", 301, "Moved Permanently",
            400, "Bad Request", 404, "Not Found", 500, "Internal Server Error");

    // TODO : les constantes OK (200) et NOT_FOUND (404) doivent être LES instances renvoyées par of().
    public static final HttpStatus OK = new HttpStatus(200, "OK");
    public static final HttpStatus NOT_FOUND = new HttpStatus(404, "Not Found");

    private final int code;
    private final String reason;

    // TODO : personne en dehors de la classe ne doit pouvoir créer d'instance.
    public HttpStatus(int code, String reason) {
        this.code = code;
        this.reason = reason;
    }

    /**
     * Renvoie l'unique instance du code (créée au premier appel, puis réutilisée).
     * Raison : celle de REASONS, ou "Unknown". Code hors de [100, 599] : IllegalArgumentException
     * dont le message contient le code.
     */
    public static HttpStatus of(int code) {
        throw new UnsupportedOperationException("of à écrire");
    }

    /**
     * Lit une ligne de statut : "404 Not Found", " 201 ", "418 I'm a teapot"… Seul le premier mot
     * compte. Ligne illisible : IllegalArgumentException.
     */
    public static HttpStatus from(String statusLine) {
        throw new UnsupportedOperationException("from à écrire");
    }

    public int code() { return code; }

    public String reason() { return reason; }

    public boolean isError() { return code >= 400; }

    @Override public String toString() { return code + " " + reason; }
}
