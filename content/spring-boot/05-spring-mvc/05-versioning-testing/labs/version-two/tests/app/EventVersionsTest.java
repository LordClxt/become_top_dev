package app;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest({ EventController.class, HealthController.class })
@Import(EventCatalog.class)
class EventVersionsTest {

    @Autowired
    MockMvcTester mvc;

    @Test
    @DisplayName("sans en-tête : la version 1, inchangée (l'app mobile ne casse pas)")
    void noHeaderIsVersionOne() {
        assertThat(mvc.get().uri("/events/1"))
                .hasStatusOk().bodyJson().isStrictlyEqualTo("""
                        {"id": 1, "name": "Nuits de Fourvière", "date": "2026-07-03", "city": "Lyon"}""");
    }

    @Test
    @DisplayName("API-Version: 2 : la nouvelle représentation")
    void versionTwo() {
        assertThat(mvc.get().uri("/events/1").header("API-Version", "2"))
                .hasStatusOk().bodyJson().isStrictlyEqualTo("""
                        {"id": 1, "title": "Nuits de Fourvière", "startsAt": "2026-07-03T21:30:00",
                         "venue": {"name": "Théâtre antique", "city": "Lyon"}}""");
    }

    @Test
    @DisplayName("la version 1 annonce sa fin : Deprecation, Sunset, Link")
    void versionOneIsDeprecated() {
        var result = mvc.get().uri("/events/2").header("API-Version", "1").exchange();
        assertThat(result).hasStatusOk().containsHeader("Deprecation")
                .hasHeader("Sunset", "Tue, 01 Jun 2027 00:00:00 GMT");
        assertThat(result.getResponse().getHeader("Link")).as("Link").contains("https://tixa.example/docs/v2").contains("rel=\"sunset\"");
    }

    @Test
    @DisplayName("la version 2 n'est pas dépréciée")
    void versionTwoIsNotDeprecated() {
        assertThat(mvc.get().uri("/events/2").header("API-Version", "2")).hasStatusOk().doesNotContainHeader("Deprecation");
    }

    @Test
    @DisplayName("une version inconnue : 400 en ProblemDetail")
    void unknownVersionIs400() {
        assertThat(mvc.get().uri("/events/1").header("API-Version", "9"))
                .hasStatus(400).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
    }

    @Test
    @DisplayName("la sonde /health répond sans en-tête de version")
    void healthWithoutVersion() {
        assertThat(mvc.get().uri("/health")).hasStatusOk().hasBodyTextEqualTo("up");
    }

    @Test
    @DisplayName("événement inconnu : 404, dans les deux versions")
    void unknownEventIs404() {
        assertThat(mvc.get().uri("/events/99")).hasStatus(404);
        assertThat(mvc.get().uri("/events/99").header("API-Version", "2")).hasStatus(404);
    }
}
