package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

class AspectOrderTest {

    @Test
    @DisplayName("succès du premier coup : audit, mesure, tentative, puis l'inverse")
    void firstTry() {
        try (var ctx = new AnnotationConfigApplicationContext(AopConfig.class)) {
            assertThat(ctx.getBean(SeatLocker.class).lock("A12")).as("lock(\"A12\")").isEqualTo("verrou-A12");
            assertThat(ctx.getBean(Trace.class).events()).as("fil des événements").isEqualTo(List.of(
                    "audit appel lock(A12)", "mesure début", "tentative 1", "lock A12 #1", "mesure fin", "audit ok verrou-A12"));
        }
    }

    @Test
    @DisplayName("deux échecs puis succès : une seule ligne d'audit et une seule mesure")
    void retriedInside() {
        try (var ctx = new AnnotationConfigApplicationContext(AopConfig.class)) {
            ctx.getBean(SeatLocker.class).setFailures(2);
            ctx.getBean(SeatLocker.class).lock("B3");
            assertThat(ctx.getBean(Trace.class).events()).as("fil des événements").isEqualTo(List.of(
                    "audit appel lock(B3)", "mesure début",
                    "tentative 1", "lock B3 #1", "tentative 2", "lock B3 #2", "tentative 3", "lock B3 #3",
                    "mesure fin", "audit ok verrou-B3"));
        }
    }

    @Test
    @DisplayName("échec définitif : l'audit voit l'erreur finale, une seule fois")
    void finalFailure() {
        try (var ctx = new AnnotationConfigApplicationContext(AopConfig.class)) {
            ctx.getBean(SeatLocker.class).setFailures(5);
            assertThatThrownBy(() -> ctx.getBean(SeatLocker.class).lock("C1")).as("lock(\"C1\") avec 5 échecs")
                    .isInstanceOf(IllegalStateException.class);
            List<String> events = ctx.getBean(Trace.class).events();
            assertThat(events.getFirst()).as("premier événement").isEqualTo("audit appel lock(C1)");
            assertThat(events.getLast()).as("dernier événement").isEqualTo("audit échec place déjà verrouillée");
            assertThat(events.stream().filter(e -> e.startsWith("audit")).count()).as("lignes d'audit").isEqualTo(2);
            assertThat(events.stream().filter(e -> e.startsWith("tentative")).count()).as("tentatives").isEqualTo(3);
            assertThat(events.get(events.size() - 2)).as("avant-dernier événement").isEqualTo("mesure fin");
        }
    }
}
