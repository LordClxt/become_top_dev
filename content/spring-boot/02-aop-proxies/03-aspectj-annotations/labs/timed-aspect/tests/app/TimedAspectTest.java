package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.aop.support.AopUtils;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

class TimedAspectTest {

    static AnnotationConfigApplicationContext start() {
        var ctx = new AnnotationConfigApplicationContext();
        AtomicLong now = new AtomicLong();
        ctx.registerBean(Ticker.class, () -> () -> now.getAndAdd(25));   // chaque lecture avance de 25 ms
        ctx.register(AppConfig.class);
        ctx.refresh();
        return ctx;
    }

    @Test
    @DisplayName("une méthode @Timed est mesurée sous le nom de sa métrique")
    void timedMethodIsMeasured() {
        try (var ctx = start()) {
            assertThat(ctx.getBean(ReservationService.class).reserve("jazz", 2)).as("reserve(\"jazz\", 2)").isEqualTo("jazzx2");
            assertThat(ctx.getBean(Metrics.class).lines()).as("mesures").containsExactly("reservation.reserve ok 25");
        }
    }

    @Test
    @DisplayName("un appel en échec est mesuré avec le résultat erreur, et l'exception remonte")
    void failureIsMeasured() {
        try (var ctx = start()) {
            assertThatThrownBy(() -> ctx.getBean(ReservationService.class).reserve("jazz", 0)).as("reserve(\"jazz\", 0)")
                    .isExactlyInstanceOf(IllegalArgumentException.class);
            assertThat(ctx.getBean(Metrics.class).lines()).as("mesures").containsExactly("reservation.reserve erreur 25");
        }
    }

    @Test
    @DisplayName("une méthode sans @Timed n'est pas mesurée")
    void untimedMethodIgnored() {
        try (var ctx = start()) {
            assertThat(ctx.getBean(ReservationService.class).status()).as("status()").isEqualTo("ouvert");
            assertThat(ctx.getBean(Metrics.class).lines()).as("mesures après status()").isEmpty();
        }
    }

    @Test
    @DisplayName("le service est remplacé par un proxy CGLIB (il n'a pas d'interface)")
    void serviceIsProxied() {
        try (var ctx = start()) {
            assertThat(AopUtils.isCglibProxy(ctx.getBean(ReservationService.class)))
                    .as("AopUtils.isCglibProxy(reservationService) : l'auto-proxy AspectJ doit être activé").isTrue();
        }
    }
}
