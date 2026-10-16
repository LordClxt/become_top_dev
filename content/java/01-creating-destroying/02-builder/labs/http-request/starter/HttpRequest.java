import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Requête HTTP immuable. On l'obtient par {@link Builder} :
 * <pre>{@code
 * HttpRequest r = new HttpRequest.Builder(Method.POST, "https://api.example.com/orders")
 *         .header("Content-Type", "application/json")
 *         .timeout(Duration.ofSeconds(5))
 *         .body("{\"qty\": 3}")
 *         .build();
 * }</pre>
 */
public final class HttpRequest {
    public enum Method { GET, POST, PUT, DELETE }

    // TODO : champs (final !) et constructeur privé qui prend un Builder.

    public Method method() { throw new UnsupportedOperationException("method à écrire"); }
    public String url() { throw new UnsupportedOperationException("url à écrire"); }
    /** En-têtes non modifiables : nom → valeurs dans l'ordre d'ajout. */
    public Map<String, List<String>> headers() { throw new UnsupportedOperationException("headers à écrire"); }
    /** 30 secondes par défaut. */
    public Duration timeout() { throw new UnsupportedOperationException("timeout à écrire"); }
    /** Corps de la requête, chaîne vide s'il n'y en a pas. */
    public String body() { throw new UnsupportedOperationException("body à écrire"); }

    public static final class Builder {

        /**
         * Paramètres obligatoires. null : NullPointerException. URL qui ne commence pas par
         * http:// ou https:// : IllegalArgumentException, dès ici.
         */
        public Builder(Method method, String url) {
            throw new UnsupportedOperationException("Builder à écrire");
        }

        /** Ajoute une valeur à l'en-tête (un même nom peut avoir plusieurs valeurs). Nom vide : IllegalArgumentException. */
        public Builder header(String name, String value) {
            throw new UnsupportedOperationException("header à écrire");
        }

        /** Durée nulle ou négative : IllegalArgumentException. */
        public Builder timeout(Duration timeout) {
            throw new UnsupportedOperationException("timeout à écrire");
        }

        public Builder body(String body) {
            throw new UnsupportedOperationException("body à écrire");
        }

        /** GET ou DELETE avec un corps non vide : IllegalArgumentException. */
        public HttpRequest build() {
            throw new UnsupportedOperationException("build à écrire");
        }
    }
}
