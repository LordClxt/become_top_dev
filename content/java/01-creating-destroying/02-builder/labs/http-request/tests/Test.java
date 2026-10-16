import java.time.Duration;
import java.util.List;
import java.util.Map;

public class Test {
    static HttpRequest.Builder post() {
        return new HttpRequest.Builder(HttpRequest.Method.POST, "https://api.example.com/orders");
    }

    public static void main(String[] args) {
        Spec.only(args);

        Spec.test("paramètres obligatoires et valeurs par défaut", () -> {
            HttpRequest r = new HttpRequest.Builder(HttpRequest.Method.GET, "http://localhost/ping").build();
            Spec.eq(r.method(), HttpRequest.Method.GET, "method()");
            Spec.eq(r.url(), "http://localhost/ping", "url()");
            Spec.eq(r.timeout(), Duration.ofSeconds(30), "timeout() par défaut");
            Spec.eq(r.body(), "", "body() par défaut");
            Spec.eq(r.headers(), Map.of(), "headers() par défaut");
        });

        Spec.test("appels chaînés", () -> {
            HttpRequest r = post().header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(5)).body("{\"qty\": 3}").build();
            Spec.eq(r.headers().get("Content-Type"), List.of("application/json"), "en-tête Content-Type");
            Spec.eq(r.timeout(), Duration.ofSeconds(5), "timeout()");
            Spec.eq(r.body(), "{\"qty\": 3}", "body()");
        });

        Spec.test("un en-tête peut avoir plusieurs valeurs, dans l'ordre", () -> {
            HttpRequest r = post().header("Accept", "text/html").header("X-Trace", "1").header("Accept", "application/json").build();
            Spec.eq(r.headers().get("Accept"), List.of("text/html", "application/json"), "valeurs de Accept");
            Spec.eq(List.copyOf(r.headers().keySet()).size(), 2, "nombre d'en-têtes distincts");
        });

        Spec.test("validation dès le constructeur du builder", () -> {
            Spec.raises(NullPointerException.class, () -> new HttpRequest.Builder(null, "https://x"), "Builder(null, …)");
            Spec.raises(NullPointerException.class, () -> new HttpRequest.Builder(HttpRequest.Method.GET, null), "Builder(GET, null)");
            var e = Spec.raises(IllegalArgumentException.class,
                    () -> new HttpRequest.Builder(HttpRequest.Method.GET, "ftp://files"), "Builder(GET, \"ftp://files\")");
            Spec.check(e.getMessage() != null && e.getMessage().contains("ftp://files"),
                    "le message doit citer l'URL refusée pour qu'on comprenne l'erreur");
        });

        Spec.test("validation dans les méthodes du builder", () -> {
            Spec.raises(IllegalArgumentException.class, () -> post().header(" ", "x"), "header(\" \", …)");
            Spec.raises(IllegalArgumentException.class, () -> post().timeout(Duration.ZERO), "timeout(ZERO)");
            Spec.raises(IllegalArgumentException.class, () -> post().timeout(Duration.ofSeconds(-1)), "timeout(-1 s)");
        });

        Spec.test("build() vérifie les invariants qui portent sur plusieurs paramètres", () -> {
            var get = new HttpRequest.Builder(HttpRequest.Method.GET, "https://x").body("oops");
            Spec.raises(IllegalArgumentException.class, get::build, "GET avec un corps");
            var del = new HttpRequest.Builder(HttpRequest.Method.DELETE, "https://x").body("oops");
            Spec.raises(IllegalArgumentException.class, del::build, "DELETE avec un corps");
            Spec.eq(new HttpRequest.Builder(HttpRequest.Method.PUT, "https://x").body("ok").build().body(), "ok", "PUT avec un corps");
        });

        Spec.test("la requête est immuable : ses en-têtes ne se modifient pas", () -> {
            HttpRequest r = post().header("A", "1").build();
            Spec.raises(UnsupportedOperationException.class, () -> r.headers().put("B", List.of("2")), "headers().put(…)");
            Spec.raises(UnsupportedOperationException.class, () -> r.headers().get("A").add("3"), "headers().get(\"A\").add(…)");
        });

        Spec.test("un builder réutilisé ne modifie pas les requêtes déjà construites", () -> {
            HttpRequest.Builder b = post().header("A", "1");
            HttpRequest first = b.build();
            b.header("A", "2").header("B", "x").timeout(Duration.ofSeconds(1));
            HttpRequest second = b.build();
            Spec.eq(first.headers(), Map.of("A", List.of("1")),
                    "en-têtes de la PREMIÈRE requête après avoir continué à utiliser le builder (copie-les dans build)");
            Spec.eq(first.timeout(), Duration.ofSeconds(30), "timeout de la première requête");
            Spec.eq(second.headers().get("A"), List.of("1", "2"), "valeurs de A dans la seconde requête");
        });

        Spec.test("les champs de HttpRequest sont tous final", () -> {
            var fields = HttpRequest.class.getDeclaredFields();
            Spec.check(fields.length > 0, "HttpRequest n'a encore aucun champ");
            for (var f : fields) {
                if (java.lang.reflect.Modifier.isStatic(f.getModifiers())) continue;
                Spec.check(java.lang.reflect.Modifier.isFinal(f.getModifiers()), "le champ " + f.getName() + " n'est pas final");
            }
        });

        Spec.done();
    }
}
