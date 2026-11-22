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
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class M2ReservationTest {
    @Autowired
    MockMvcTester mvc;

    private MockMvcTester.MockMvcRequestBuilder reserve(long event, String customer, String json) {
        var request = mvc.post().uri("/api/events/" + event + "/reservations").contentType(MediaType.APPLICATION_JSON).content(json);
        return customer == null ? request : request.header("X-Customer-Id", customer);
    }

    @Test
    @DisplayName("M2 : réservation créée, 201 avec Location, places retirées")
    void created() {
        var result = reserve(1, "c-1", """
                {"seats": 2, "email": "ana@example.com"}""").exchange();
        assertThat(result).hasStatus(201);
        assertThat(result.getResponse().getHeader("Location")).as("Location").matches("/api/reservations/\\d+");
        assertThat(result).bodyJson().extractingPath("$.customerId").isEqualTo("c-1");
        assertThat(mvc.get().uri("/api/events/1")).bodyJson().extractingPath("$.seatsLeft").isEqualTo(118);
    }

    @Test
    @DisplayName("M2 : sans client identifié, 401")
    void anonymous() {
        assertThat(reserve(1, null, """
                {"seats": 2, "email": "ana@example.com"}""")).hasStatus(401);
    }

    @Test
    @DisplayName("M2 : demande invalide, 400 qui nomme les champs")
    void invalid() {
        var result = reserve(1, "c-1", """
                {"seats": 9, "email": "non"}""").exchange();
        assertThat(result).hasStatus(400).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(result).bodyJson().extractingPath("$.errors[*].field").asArray().containsExactlyInAnyOrder("seats", "email");
    }

    @Test
    @DisplayName("M2 : plus assez de places, 409 sold-out, et rien n'est retiré")
    void soldOut() {
        var result = reserve(2, "c-2", """
                {"seats": 4, "email": "ben@example.com"}""").exchange();
        assertThat(result).hasStatus(409).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(result).bodyJson().extractingPath("$.type").isEqualTo("https://tixa.example/problems/sold-out");
        assertThat(mvc.get().uri("/api/events/2")).bodyJson().extractingPath("$.seatsLeft").isEqualTo(3);
    }

    @Test
    @DisplayName("M2 : réserver un événement inconnu, 404")
    void unknownEvent() {
        assertThat(reserve(99, "c-1", """
                {"seats": 1, "email": "ana@example.com"}""")).hasStatus(404);
    }
}
