package app;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest
@Import({ EventStore.class, CustomerDirectory.class })
@DirtiesContext
class M3VersionsTest {
    @Autowired
    MockMvcTester mvc;

    @Test
    @DisplayName("M3 : API-Version 2, la nouvelle représentation")
    void versionTwo() {
        assertThat(mvc.get().uri("/api/events/1").header("API-Version", "2")).hasStatusOk().bodyJson().isStrictlyEqualTo("""
                {"id": 1, "title": "Nuits de Fourvière", "startsAt": "2026-07-03T21:30:00",
                 "venue": {"name": "Théâtre antique", "city": "Lyon"}, "seatsLeft": 120}""");
    }

    @Test
    @DisplayName("M3 : sans en-tête, la version 1 reste la même")
    void defaultIsOne() {
        assertThat(mvc.get().uri("/api/events/1")).hasStatusOk().bodyJson().extractingPath("$.name").isEqualTo("Nuits de Fourvière");
    }

    @Test
    @DisplayName("M3 : version inconnue, 400")
    void unknownVersion() {
        assertThat(mvc.get().uri("/api/events/1").header("API-Version", "7")).hasStatus(400);
    }

    @Test
    @DisplayName("M3 : X-Request-Id sur chaque réponse, y compris les erreurs ; un id sûr est repris")
    void correlationId() {
        assertThat(mvc.get().uri("/api/events/1")).containsHeader("X-Request-Id");
        assertThat(mvc.get().uri("/api/events/99")).hasStatus(404).containsHeader("X-Request-Id");
        assertThat(mvc.get().uri("/api/events/1").header("X-Request-Id", "abc-123")).hasHeader("X-Request-Id", "abc-123");
        var forged = mvc.get().uri("/api/events/1").header("X-Request-Id", "<b>forged</b>").exchange();
        assertThat(forged.getResponse().getHeader("X-Request-Id")).as("id douteux remplacé").doesNotContain("<");
    }
}
