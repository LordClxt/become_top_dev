package app;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class M2JournalTest {

    @Test
    @DisplayName("M2 — les réservations partent dans le journal par lots de 3")
    void batches() {
        try (var ctx = Tixa.start()) {
            ReservationService service = ctx.getBean(ReservationService.class);
            JournalSink sink = ctx.getBean(JournalSink.class);
            service.reserve("jazz-0612", 1, "a", null);
            service.reserve("jazz-0612", 2, "b", null);
            assertThat(sink.lines()).as("lignes écrites après 2 réservations (lot incomplet)").isEmpty();
            service.reserve("expo-1003", 1, "c", null);
            assertThat(sink.lines()).as("lignes écrites après 3 réservations")
                    .containsExactly("R-1;jazz-0612;1;4500", "R-2;jazz-0612;2;9000", "R-3;expo-1003;1;1500");
        }
    }

    @Test
    @DisplayName("M2 — à l'arrêt, le tampon est vidé avant la fermeture du support")
    void flushedBeforeSinkCloses() {
        var ctx = Tixa.start();
        ReservationService service = ctx.getBean(ReservationService.class);
        JournalSink sink = ctx.getBean(JournalSink.class);
        service.reserve("jazz-0612", 1, "a", null);
        service.reserve("solidays", 4, "b", null);
        ctx.close();
        assertThat(sink.isClosed()).as("support fermé après ctx.close()").isTrue();
        assertThat(sink.lines()).as("lignes écrites après ctx.close() (rien ne doit être perdu)")
                .containsExactly("R-1;jazz-0612;1;4500", "R-2;solidays;4;28800");
    }
}
