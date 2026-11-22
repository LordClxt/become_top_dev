package app;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest
@Import({ EventStore.class, CustomerDirectory.class })
@DirtiesContext
class M1CatalogTest {
    @Autowired
    MockMvcTester mvc;

    @Test
    @DisplayName("M1 : GET /api/events renvoie le catalogue (contrat v1)")
    void list() {
        assertThat(mvc.get().uri("/api/events")).hasStatusOk().bodyJson()
                .extractingPath("$[*].name").asArray().containsExactly("Nuits de Fourvière", "Jazz à Vienne");
    }

    @Test
    @DisplayName("M1 : GET /api/events/1 renvoie un événement (contrat v1)")
    void one() {
        assertThat(mvc.get().uri("/api/events/1")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                {"id": 1, "name": "Nuits de Fourvière", "date": "2026-07-03", "city": "Lyon", "seatsLeft": 120}""");
    }

    @Test
    @DisplayName("M1 : événement inconnu, 404 en ProblemDetail avec un type stable")
    void notFound() {
        var result = mvc.get().uri("/api/events/99").exchange();
        assertThat(result).hasStatus(404).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(result).bodyJson().extractingPath("$.type").isEqualTo("https://tixa.example/problems/event-not-found");
    }

    @Test
    @DisplayName("M1 : identifiant non numérique, 400 en ProblemDetail")
    void badId() {
        assertThat(mvc.get().uri("/api/events/abc")).hasStatus(400).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
    }
}
