package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

/** Journées rejouées par le support : chaque test part d'une base vide. */
class BookingTest {

    @Test
    @DisplayName("une réservation payée enregistre ses places")
    void paidBookingIsSaved() throws Exception {
        try (var ctx = new AnnotationConfigApplicationContext(TxConfig.class)) {
            assertThat(ctx.getBean(BookingService.class).book("jazz", 1, 2, "visa")).as("book(jazz, 1, 2, visa)").isEqualTo("pay-9000");
            assertThat(ctx.getBean(SeatRepository.class).soldCount("jazz")).as("places vendues pour jazz").isEqualTo(2);
        }
    }

    @Test
    @DisplayName("paiement refusé : aucune place ne reste vendue")
    void declinedPaymentSellsNothing() {
        try (var ctx = new AnnotationConfigApplicationContext(TxConfig.class)) {
            assertThatThrownBy(() -> ctx.getBean(BookingService.class).book("rock", 10, 3, "declined"))
                    .as("book avec une carte refusée").isInstanceOf(PaymentDeclinedException.class);
            assertThat(ctx.getBean(SeatRepository.class).soldCount("rock"))
                    .as("places vendues pour rock après un paiement refusé").isZero();
        }
    }

    @Test
    @DisplayName("carte expirée : aucune place ne reste vendue")
    void expiredCardSellsNothing() {
        try (var ctx = new AnnotationConfigApplicationContext(TxConfig.class)) {
            assertThatThrownBy(() -> ctx.getBean(BookingService.class).book("expo", 1, 1, "expired"))
                    .as("book avec une carte expirée").isInstanceOf(CardExpiredException.class);
            assertThat(ctx.getBean(SeatRepository.class).soldCount("expo"))
                    .as("places vendues pour expo après une carte expirée").isZero();
        }
    }

    @Test
    @DisplayName("une journée mêlée : seules les réservations payées restent")
    void mixedDay() throws Exception {
        try (var ctx = new AnnotationConfigApplicationContext(TxConfig.class)) {
            BookingService booking = ctx.getBean(BookingService.class);
            booking.book("jazz", 1, 2, "visa");
            try { booking.book("jazz", 3, 2, "declined"); } catch (PaymentDeclinedException expected) { }
            try { booking.book("jazz", 5, 1, "expired"); } catch (CardExpiredException expected) { }
            booking.book("jazz", 7, 1, "visa");
            assertThat(ctx.getBean(SeatRepository.class).soldCount("jazz")).as("places vendues pour jazz en fin de journée").isEqualTo(3);
        }
    }
}
