package app;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

class HoldDeskTest {

    @Test
    @DisplayName("deux clients obtiennent deux réservations distinctes")
    void distinctHolds() {
        try (var ctx = new AnnotationConfigApplicationContext(HoldConfig.class)) {
            HoldDesk desk = ctx.getBean(HoldDesk.class);
            SeatHold ana = desk.open();
            SeatHold bob = desk.open();
            ana.hold("A12");
            assertThat(bob).as("réservation du 2e client (doit être un autre objet que celle du 1er)").isNotSameAs(ana);
            assertThat(bob.seats()).as("places du 2e client, qui n'a rien réservé").isEmpty();
        }
    }

    @Test
    @DisplayName("SeatHold est déclaré en portée prototype, HoldDesk reste un singleton")
    void scopes() {
        try (var ctx = new AnnotationConfigApplicationContext(HoldConfig.class)) {
            assertThat(ctx.isPrototype("seatHold")).as("ctx.isPrototype(\"seatHold\")").isTrue();
            assertThat(ctx.isSingleton("holdDesk")).as("ctx.isSingleton(\"holdDesk\")").isTrue();
        }
    }

    @Test
    @DisplayName("une réservation ouverte reste active tant que l'application tourne")
    void notReleasedEarly() {
        try (var ctx = new AnnotationConfigApplicationContext(HoldConfig.class)) {
            SeatHold hold = ctx.getBean(HoldDesk.class).open();
            hold.hold("B3");
            assertThat(hold.isReleased()).as("réservation libérée avant l'arrêt").isFalse();
        }
    }

    @Test
    @DisplayName("à l'arrêt du conteneur, toutes les réservations ouvertes sont libérées")
    void releasedOnClose() {
        var ctx = new AnnotationConfigApplicationContext(HoldConfig.class);
        HoldDesk desk = ctx.getBean(HoldDesk.class);
        ReleaseLog log = ctx.getBean(ReleaseLog.class);
        SeatHold ana = desk.open();
        SeatHold bob = desk.open();
        ctx.close();
        assertThat(ana.isReleased()).as("réservation d'ana après ctx.close()").isTrue();
        assertThat(bob.isReleased()).as("réservation de bob après ctx.close()").isTrue();
        assertThat(log.lines()).as("journal des libérations après ctx.close()").containsExactly("2 réservations libérées");
    }
}
