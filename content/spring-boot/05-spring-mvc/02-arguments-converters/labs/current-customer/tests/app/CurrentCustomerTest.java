package app;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.assertj.MockMvcTester;

@WebMvcTest(MeController.class)
@Import({ CustomerDirectory.class, ReservationStore.class })
class CurrentCustomerTest {

    @Autowired
    MockMvcTester mvc;

    @Test
    @DisplayName("GET /me renvoie le client de l'en-tête X-Customer-Id")
    void me() {
        assertThat(mvc.get().uri("/me").header("X-Customer-Id", "c-2"))
                .hasStatusOk().bodyJson().isLenientlyEqualTo("""
                        {"id": "c-2", "name": "Ben"}""");
    }

    @Test
    @DisplayName("GET /me/reservations ne renvoie que les réservations du client")
    void myReservations() {
        assertThat(mvc.get().uri("/me/reservations").header("X-Customer-Id", "c-1"))
                .hasStatusOk().bodyJson().extractingPath("$[*].event").asArray()
                .containsExactly("Nuits de Fourvière", "Les Eurockéennes");
    }

    @Test
    @DisplayName("sans en-tête X-Customer-Id : 401")
    void missingHeaderIs401() {
        assertThat(mvc.get().uri("/me/reservations")).hasStatus(401);
    }

    @Test
    @DisplayName("client inconnu : 401")
    void unknownCustomerIs401() {
        assertThat(mvc.get().uri("/me").header("X-Customer-Id", "c-404")).hasStatus(401);
    }

    @Test
    @DisplayName("les autres paramètres restent à Spring : ?lang=en arrive dans lang")
    void otherParametersUntouched() {
        assertThat(mvc.get().uri("/me/greeting?lang=en").header("X-Customer-Id", "c-1"))
                .hasStatusOk().hasBodyTextEqualTo("Bonjour Ana (en)");
    }
}
