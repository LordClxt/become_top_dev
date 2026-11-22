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
import org.springframework.test.web.servlet.assertj.MvcTestResult;

@WebMvcTest
@Import({ EventStore.class, CustomerDirectory.class, IdempotencyStore.class })
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class BossTest {
    static final String OK = """
            {"eventId": 1, "seats": 2, "email": "ana@example.com"}""";

    @Autowired
    MockMvcTester mvc;

    @Autowired
    EventStore events;

    MvcTestResult post(String key, String customer, String json) {
        var r = mvc.post().uri("/reservations").contentType(MediaType.APPLICATION_JSON).content(json);
        if (key != null) r.header("Idempotency-Key", key);
        if (customer != null) r.header("X-Customer-Id", customer);
        return r.exchange();
    }

    static String type(String name) {
        return "https://tixa.example/problems/" + name;
    }

    @Test
    @DisplayName("première requête : 201, Location et réservation")
    void created() {
        var res = post("cle-00000001", "c-1", OK);
        assertThat(res).hasStatus(201).doesNotContainHeader("Idempotent-Replayed");
        assertThat(res.getResponse().getHeader("Location")).matches("/reservations/\\d+");
        assertThat(res).bodyJson().isLenientlyEqualTo("""
                {"eventId": 1, "customerId": "c-1", "seats": 2, "email": "ana@example.com"}""");
        assertThat(events.find(1).orElseThrow().seatsLeft()).isEqualTo(118);
    }

    @Test
    @DisplayName("rejeu : même réponse, même identifiant, Idempotent-Replayed, et aucune place retirée deux fois")
    void replay() throws Exception {
        var first = post("cle-00000002", "c-1", OK);
        var again = post("cle-00000002", "c-1", OK);
        assertThat(again).hasStatus(201).hasHeader("Idempotent-Replayed", "true")
                .hasHeader("Location", first.getResponse().getHeader("Location"));
        assertThat(again.getResponse().getContentAsString()).isEqualTo(first.getResponse().getContentAsString());
        assertThat(events.find(1).orElseThrow().seatsLeft()).isEqualTo(118);
    }

    @Test
    @DisplayName("même clé, autre demande ou autre client : 422 idempotency-key-reused")
    void reused() {
        post("cle-00000003", "c-1", OK);
        var other = post("cle-00000003", "c-1", """
                {"eventId": 1, "seats": 3, "email": "ana@example.com"}""");
        assertThat(other).hasStatus(422).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(other).bodyJson().extractingPath("$.type").isEqualTo(type("idempotency-key-reused"));
        assertThat(post("cle-00000003", "c-2", OK)).hasStatus(422);
        assertThat(events.find(1).orElseThrow().seatsLeft()).isEqualTo(118);
    }

    @Test
    @DisplayName("clé absente ou invalide : 400 idempotency-key-missing")
    void missingKey() {
        for (String key : new String[] { null, "court", "clé avec espaces", "x".repeat(65) }) {
            var res = post(key, "c-1", OK);
            assertThat(res).as("clé " + key).hasStatus(400).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
            assertThat(res).bodyJson().extractingPath("$.type").isEqualTo(type("idempotency-key-missing"));
        }
    }

    @Test
    @DisplayName("client non identifié : 401")
    void anonymous() {
        assertThat(post("cle-00000004", null, OK)).hasStatus(401);
        assertThat(post("cle-00000004", "c-404", OK)).hasStatus(401);
    }

    @Test
    @DisplayName("demande invalide : 400 avec les champs fautifs")
    void invalid() {
        var res = post("cle-00000005", "c-1", """
                {"seats": 0, "email": "x"}""");
        assertThat(res).hasStatus(400).hasContentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
        assertThat(res).bodyJson().extractingPath("$.errors[*].field").asArray().containsExactlyInAnyOrder("eventId", "seats", "email");
    }

    @Test
    @DisplayName("événement inconnu : 404 event-not-found ; plus de places : 409 sold-out")
    void businessErrors() {
        assertThat(post("cle-00000006", "c-1", """
                {"eventId": 99, "seats": 1, "email": "ana@example.com"}""")).bodyJson().extractingPath("$.type").isEqualTo(type("event-not-found"));
        var soldOut = post("cle-00000007", "c-1", """
                {"eventId": 2, "seats": 4, "email": "ana@example.com"}""");
        assertThat(soldOut).hasStatus(409).bodyJson().extractingPath("$.type").isEqualTo(type("sold-out"));
        assertThat(events.find(2).orElseThrow().seatsLeft()).isEqualTo(3);
    }

    @Test
    @DisplayName("un échec n'est pas mémorisé : la même clé peut resservir une fois la demande corrigée")
    void failureNotRemembered() {
        post("cle-00000008", "c-1", """
                {"eventId": 2, "seats": 4, "email": "ana@example.com"}""");
        assertThat(post("cle-00000008", "c-1", """
                {"eventId": 2, "seats": 3, "email": "ana@example.com"}""")).hasStatus(201).doesNotContainHeader("Idempotent-Replayed");
    }
}
