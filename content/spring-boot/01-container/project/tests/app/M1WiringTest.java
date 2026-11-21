package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class M1WiringTest {

    @Test
    @DisplayName("M1 — concert : prix standard, identifiant et horloge du conteneur")
    void concert() {
        try (var ctx = Tixa.start()) {
            Reservation r = ctx.getBean(ReservationService.class).reserve("jazz-0612", 2, "ana", null);
            assertThat(r.totalCents()).as("total de 2 places à 45,00 €").isEqualTo(9000);
            assertThat(r.id()).as("identifiant de la 1re réservation (bean Supplier<String> du conteneur)").isEqualTo("R-1");
            assertThat(r.createdAt()).as("date de création (doit venir du bean Clock, pas d'Instant.now())").isEqualTo(Tixa.NOW);
            assertThat(r.customer()).as("client").isEqualTo("ana");
        }
    }

    @Test
    @DisplayName("M1 — festival : la politique festivalPricing s'applique (10 % dès 4 places)")
    void festival() {
        try (var ctx = Tixa.start()) {
            ReservationService service = ctx.getBean(ReservationService.class);
            assertThat(service.reserve("solidays", 3, "bob", null).totalCents()).as("3 places à 80,00 €").isEqualTo(24000);
            assertThat(service.reserve("solidays", 4, "bob", null).totalCents()).as("4 places à 80,00 € avec 10 %").isEqualTo(28800);
        }
    }

    @Test
    @DisplayName("M1 — catégorie sans politique dédiée : prix standard")
    void fallbackToStandard() {
        try (var ctx = Tixa.start()) {
            assertThat(ctx.getBean(ReservationService.class).reserve("expo-1003", 2, "eve", null).totalCents())
                    .as("expo-1003, catégorie expo sans bean expoPricing").isEqualTo(3000);
        }
    }

    @Test
    @DisplayName("M1 — complet : SoldOutException quand il ne reste plus assez de places")
    void soldOut() {
        try (var ctx = Tixa.start()) {
            ReservationService service = ctx.getBean(ReservationService.class);
            service.reserve("rock-0701", 2, "ana", null);
            assertThatThrownBy(() -> service.reserve("rock-0701", 1, "bob", null))
                    .as("3e place pour rock-0701 (capacité 2)")
                    .isInstanceOf(SoldOutException.class)
                    .hasMessage("complet : rock-0701 (0 places restantes)");
        }
    }

    @Test
    @DisplayName("M1 — entrées invalides refusées")
    void invalidInput() {
        try (var ctx = Tixa.start()) {
            ReservationService service = ctx.getBean(ReservationService.class);
            assertThatThrownBy(() -> service.reserve("nope", 1, "ana", null)).as("événement inconnu")
                    .isInstanceOf(IllegalArgumentException.class).hasMessage("événement inconnu : nope");
            assertThatThrownBy(() -> service.reserve("jazz-0612", 0, "ana", null)).as("0 place")
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    @DisplayName("M1 — les politiques de prix sont des beans nommés standardPricing et festivalPricing")
    void pricingBeans() {
        try (var ctx = Tixa.start()) {
            assertThat(ctx.getBeansOfType(PricingPolicy.class).keySet())
                    .as("beans PricingPolicy").containsExactlyInAnyOrder("standardPricing", "festivalPricing");
        }
    }
}
