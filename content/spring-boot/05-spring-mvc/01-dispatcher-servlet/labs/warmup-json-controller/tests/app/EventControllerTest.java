package app;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

/** La couche web seule : le contrôleur, le catalogue, et une DispatcherServlet de test. */
@WebMvcTest(EventController.class)
@Import(EventCatalog.class)
class EventControllerTest {

    @Autowired
    MockMvcTester mvc;

    @Test
    @DisplayName("GET /events renvoie le catalogue en JSON")
    void listInJson() {
        assertThat(mvc.get().uri("/events"))
                .hasStatusOk()
                .hasContentTypeCompatibleWith(MediaType.APPLICATION_JSON)
                .bodyJson().extractingPath("$[*].name")
                .asArray().containsExactly("Nuits de Fourvière", "Jazz à Vienne", "Les Eurockéennes");
    }

    @Test
    @DisplayName("GET /events/2 renvoie un événement en JSON")
    void oneInJson() {
        assertThat(mvc.get().uri("/events/2"))
                .hasStatusOk()
                .hasContentTypeCompatibleWith(MediaType.APPLICATION_JSON)
                .bodyJson().isLenientlyEqualTo("""
                        {"id": 2, "name": "Jazz à Vienne", "city": "Vienne", "seatsLeft": 0}""");
    }

    @Test
    @DisplayName("GET /events/99 répond 404, sans corps")
    void unknownIs404() {
        var result = mvc.get().uri("/events/99").exchange();
        assertThat(result).hasStatus(404);
        assertThat(result.getResponse().getContentLength()).as("taille du corps").isZero();
    }
}
