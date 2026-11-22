package app;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

/** Un vrai Tomcat sur un port libre : ce que le client reçoit vraiment. */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
class CorrelationIdTest {
    static final String UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

    @LocalServerPort
    int port;

    final HttpClient http = HttpClient.newHttpClient();

    HttpResponse<String> get(String path, String... headers) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path));
        if (headers.length > 0) {
            request.headers(headers);
        }
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    static String requestId(HttpResponse<?> response) {
        return response.headers().firstValue("X-Request-Id").orElse(null);
    }

    @Test
    @DisplayName("un identifiant est généré sur une réponse JSON")
    void generatedOnJson() throws Exception {
        var res = get("/events/1");
        assertThat(res.statusCode()).isEqualTo(200);
        assertThat(requestId(res)).as("X-Request-Id").isNotNull().matches(UUID_RE);
    }

    @Test
    @DisplayName("réponse texte : X-Request-Id et X-Handler arrivent au client")
    void presentOnText() throws Exception {
        var res = get("/ping");
        assertThat(res.body()).isEqualTo("pong");
        assertThat(requestId(res)).as("X-Request-Id").isNotNull();
        assertThat(res.headers().firstValue("X-Handler")).as("X-Handler").hasValue("ApiController#ping");
    }

    @Test
    @DisplayName("URL inconnue (404) : l'identifiant est là aussi")
    void presentOn404() throws Exception {
        var res = get("/nope");
        assertThat(res.statusCode()).isEqualTo(404);
        assertThat(requestId(res)).as("X-Request-Id sur un 404").isNotNull();
    }

    @Test
    @DisplayName("panne (500) : l'identifiant est là, et c'est celui envoyé par le client")
    void presentOn500() throws Exception {
        var res = get("/boom", "X-Request-Id", "panne-42");
        assertThat(res.statusCode()).isEqualTo(500);
        assertThat(requestId(res)).as("X-Request-Id sur un 500").isEqualTo("panne-42");
    }

    @Test
    @DisplayName("un identifiant sûr envoyé par le client est repris")
    void incomingIdEchoed() throws Exception {
        assertThat(requestId(get("/events/1", "X-Request-Id", "abc-123"))).isEqualTo("abc-123");
    }

    @Test
    @DisplayName("un identifiant douteux est remplacé")
    void unsafeIdReplaced() throws Exception {
        assertThat(requestId(get("/events/1", "X-Request-Id", "<script>alert(1)</script>"))).matches(UUID_RE);
        assertThat(requestId(get("/events/1", "X-Request-Id", "a".repeat(200)))).matches(UUID_RE);
    }

    @Test
    @DisplayName("les journaux de la requête portent le même identifiant (MDC)")
    void mdcMatchesHeader() throws Exception {
        var res = get("/whoami");
        assertThat(res.body()).as("MDC pendant la requête").isEqualTo(requestId(res));
    }

    @Test
    @DisplayName("/admin/** : 403 sans le bon jeton, 200 avec")
    void adminGuard() throws Exception {
        assertThat(get("/admin/stats").statusCode()).isEqualTo(403);
        assertThat(get("/admin/stats", "X-Admin-Token", "faux").statusCode()).isEqualTo(403);
        assertThat(get("/admin/stats", "X-Admin-Token", "s3cret").statusCode()).isEqualTo(200);
    }

    @Test
    @DisplayName("le MDC est vidé après la requête (le thread retourne au pool)")
    void mdcCleared() throws Exception {
        MDC.clear();
        new CorrelationIdFilter().doFilter(new MockHttpServletRequest("GET", "/ping"), new MockHttpServletResponse(), new MockFilterChain());
        assertThat(MDC.get("requestId")).as("MDC après le filtre").isNull();
    }
}
