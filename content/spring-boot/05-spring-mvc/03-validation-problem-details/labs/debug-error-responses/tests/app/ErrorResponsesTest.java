package app;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(ReservationController.class)
@Import({ EventCatalog.class, ReservationService.class })
class ErrorResponsesTest {

    @Autowired
    MockMvcTester mvc;

    private MockMvcTester.MockMvcRequestBuilder post(String json) {
        return mvc.post().uri("/reservations").contentType(MediaType.APPLICATION_JSON).content(json);
    }

    @Test
    @DisplayName("une réservation valide est créée (201)")
    void validReservation() {
        assertThat(post("""
                {"eventId": 1, "seats": 2, "email": "ana@example.com"}"""))
                .hasStatus(201).bodyJson().extractingPath("$.event").isEqualTo("Nuits de Fourvière");
    }

    @Test
    @DisplayName("champs invalides : 400 en ProblemDetail, qui nomme chaque champ fautif")
    void invalidFieldsAreListed() {
        var result = post("""
                {"eventId": 1, "seats": 9, "email": "pas-un-mail"}""").exchange();
        assertThat(result).hasStatus(400).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(result).bodyJson().extractingPath("$.errors[*].field").asArray()
                .containsExactlyInAnyOrder("seats", "email");
    }

    @Test
    @DisplayName("nombre de places absent : 400 qui nomme le champ seats")
    void missingSeatsIsNamed() {
        var result = post("""
                {"eventId": 1, "email": "ana@example.com"}""").exchange();
        assertThat(result).hasStatus(400).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(result).bodyJson().extractingPath("$.errors[*].field").asArray().containsExactly("seats");
    }

    @Test
    @DisplayName("événement inconnu : 404 en ProblemDetail, avec un type stable et l'identifiant")
    void unknownEventIs404Problem() {
        var result = mvc.get().uri("/events/42").exchange();
        assertThat(result).hasStatus(404).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(result).bodyJson().isLenientlyEqualTo("""
                {"type": "https://tixa.example/problems/event-not-found", "status": 404, "eventId": 42}""");
    }

    @Test
    @DisplayName("réserver un événement inconnu : 404 aussi")
    void bookingUnknownEventIs404() {
        assertThat(post("""
                {"eventId": 99, "seats": 2, "email": "ana@example.com"}""")).hasStatus(404);
    }

    @Test
    @DisplayName("panne interne : 500 générique avec une référence, sans rien révéler")
    void internalFailureDoesNotLeak() {
        var result = mvc.get().uri("/reservations/13").exchange();
        assertThat(result).hasStatus(500).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(result).bodyText().contains("Référence").doesNotContain("db-prod").doesNotContain("tixa_rw");
    }

    @Test
    @DisplayName("mauvais Content-Type : 415, pas 500")
    void wrongContentTypeIs415() {
        assertThat(mvc.post().uri("/reservations").contentType(MediaType.TEXT_PLAIN).content("2 places"))
                .hasStatus(415).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
    }
}
