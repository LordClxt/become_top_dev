package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class M3PromotionsTest {

    @Test
    @DisplayName("M3 — tixa.promotions crée un bean Promotion par code")
    void oneBeanPerCode() {
        try (var ctx = Tixa.start("tixa.promotions", "SUMMER:15, STUDENT:30")) {
            assertThat(ctx.getBeansOfType(Promotion.class).keySet())
                    .as("beans Promotion pour tixa.promotions=SUMMER:15, STUDENT:30")
                    .containsExactlyInAnyOrder("promotion-SUMMER", "promotion-STUDENT");
        }
    }

    @Test
    @DisplayName("M3 — un code promo applique sa remise au total")
    void appliesDiscount() {
        try (var ctx = Tixa.start("tixa.promotions", "SUMMER:15,STUDENT:30")) {
            ReservationService service = ctx.getBean(ReservationService.class);
            assertThat(service.reserve("jazz-0612", 2, "ana", "SUMMER").totalCents()).as("9000 avec SUMMER (15 %)").isEqualTo(7650);
            assertThat(service.reserve("solidays", 4, "bob", "STUDENT").totalCents()).as("28800 avec STUDENT (30 %)").isEqualTo(20160);
        }
    }

    @Test
    @DisplayName("M3 — un code inconnu est refusé et ne consomme pas de places")
    void unknownCode() {
        try (var ctx = Tixa.start("tixa.promotions", "SUMMER:15")) {
            ReservationService service = ctx.getBean(ReservationService.class);
            assertThatThrownBy(() -> service.reserve("rock-0701", 2, "ana", "WINTER")).as("code WINTER")
                    .isInstanceOf(IllegalArgumentException.class).hasMessage("code promo inconnu : WINTER");
            assertThat(service.reserve("rock-0701", 2, "ana", null).seats())
                    .as("les 2 places de rock-0701 doivent rester disponibles après le refus").isEqualTo(2);
        }
    }

    @Test
    @DisplayName("M3 — une promotion mal écrite fait échouer le démarrage")
    void invalidPromotionFailsFast() {
        for (String bad : new String[] {"SUMMER:150", "SUMMER:0", "SUMMER", "summer:10"}) {
            assertThatThrownBy(() -> Tixa.start("tixa.promotions", bad).close())
                    .as("démarrage avec tixa.promotions=" + bad)
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("promotion invalide : '" + bad + "' (attendu CODE:pourcentage, de 1 à 90)");
        }
    }

    @Test
    @DisplayName("M3 — sans propriété, aucune promotion et l'application démarre")
    void noPromotions() {
        try (var ctx = Tixa.start()) {
            assertThat(ctx.getBeansOfType(Promotion.class)).as("promotions sans tixa.promotions").isEmpty();
        }
    }
}
