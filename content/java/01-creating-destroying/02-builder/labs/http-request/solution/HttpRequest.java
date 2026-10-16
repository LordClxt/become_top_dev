import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Requête HTTP immuable. On l'obtient par {@link Builder}. */
public final class HttpRequest {
    public enum Method { GET, POST, PUT, DELETE }

    private final Method method;
    private final String url;
    private final Map<String, List<String>> headers;
    private final Duration timeout;
    private final String body;

    private HttpRequest(Builder b) {
        method = b.method;
        url = b.url;
        // Copie profonde : le builder peut continuer à évoluer sans toucher cette requête.
        Map<String, List<String>> copy = new LinkedHashMap<>();
        b.headers.forEach((name, values) -> copy.put(name, List.copyOf(values)));
        headers = Map.copyOf(copy);
        timeout = b.timeout;
        body = b.body;
        // Invariant entre plusieurs paramètres : vérifié sur les champs copiés.
        if ((method == Method.GET || method == Method.DELETE) && !body.isEmpty()) {
            throw new IllegalArgumentException(method + " ne peut pas avoir de corps (url=" + url + ")");
        }
    }

    public Method method() { return method; }
    public String url() { return url; }
    /** En-têtes non modifiables : nom → valeurs dans l'ordre d'ajout. */
    public Map<String, List<String>> headers() { return headers; }
    public Duration timeout() { return timeout; }
    /** Corps de la requête, chaîne vide s'il n'y en a pas. */
    public String body() { return body; }

    public static final class Builder {
        // Paramètres obligatoires
        private final Method method;
        private final String url;
        // Paramètres optionnels, avec leurs valeurs par défaut
        private final Map<String, List<String>> headers = new LinkedHashMap<>();
        private Duration timeout = Duration.ofSeconds(30);
        private String body = "";

        public Builder(Method method, String url) {
            this.method = Objects.requireNonNull(method, "method");
            this.url = Objects.requireNonNull(url, "url");
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                throw new IllegalArgumentException("url doit commencer par http:// ou https:// : " + url);
            }
        }

        public Builder header(String name, String value) {
            if (name == null || name.isBlank()) {
                throw new IllegalArgumentException("nom d'en-tête vide");
            }
            headers.computeIfAbsent(name, n -> new ArrayList<>()).add(Objects.requireNonNull(value, "value"));
            return this;
        }

        public Builder timeout(Duration timeout) {
            Objects.requireNonNull(timeout, "timeout");
            if (timeout.isZero() || timeout.isNegative()) {
                throw new IllegalArgumentException("timeout doit être positif : " + timeout);
            }
            this.timeout = timeout;
            return this;
        }

        public Builder body(String body) {
            this.body = Objects.requireNonNull(body, "body");
            return this;
        }

        public HttpRequest build() {
            return new HttpRequest(this);
        }
    }
}
