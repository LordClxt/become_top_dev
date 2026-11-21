package app;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.env.MapPropertySource;

class FeatureToggleTest {

    static AnnotationConfigApplicationContext start(String... keyValues) {
        Map<String, Object> props = new HashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) props.put(keyValues[i], keyValues[i + 1]);
        var ctx = new AnnotationConfigApplicationContext();
        ctx.getEnvironment().getPropertySources().addFirst(new MapPropertySource("test", props));
        ctx.register(ShopConfig.class);
        ctx.refresh();
        return ctx;
    }

    @BeforeEach
    void reset() {
        ExperimentalPricing.INSTANCES.set(0);
    }

    @Test
    @DisplayName("sans configuration, toutes les fonctionnalités sont actives")
    void allEnabledByDefault() {
        try (var ctx = start()) {
            assertThat(ctx.containsBean("loyaltyProgram")).as("loyaltyProgram présent").isTrue();
            assertThat(ctx.containsBean("giftCards")).as("giftCards présent").isTrue();
            assertThat(ctx.getBean(Checkout.class).total(1000)).as("total(1000) avec la fidélité").isEqualTo(900);
            assertThat(ctx.getBean(FeatureTogglePostProcessor.class).disabledBeans())
                    .as("disabledBeans() sans rien désactiver").isEmpty();
        }
    }

    @Test
    @DisplayName("une fonctionnalité coupée retire le @Component correspondant")
    void disablesScannedComponent() {
        try (var ctx = start("tixa.features.loyalty", "false")) {
            assertThat(ctx.containsBean("loyaltyProgram")).as("loyaltyProgram avec tixa.features.loyalty=false").isFalse();
            assertThat(ctx.getBean(Checkout.class).total(1000)).as("total(1000) sans fidélité").isEqualTo(1000);
        }
    }

    @Test
    @DisplayName("une fonctionnalité coupée retire aussi un bean déclaré par une méthode @Bean")
    void disablesBeanMethod() {
        try (var ctx = start("tixa.features.gift-cards", "false")) {
            assertThat(ctx.containsBean("giftCards")).as("giftCards avec tixa.features.gift-cards=false").isFalse();
            assertThat(ctx.containsBean("loyaltyProgram")).as("loyaltyProgram, non concerné").isTrue();
        }
    }

    @Test
    @DisplayName("un bean d'une fonctionnalité coupée n'est jamais instancié")
    void neverInstantiated() {
        try (var ctx = start("tixa.features.experimental-pricing", "false")) {
            assertThat(ExperimentalPricing.INSTANCES.get())
                    .as("instances d'ExperimentalPricing créées (son constructeur appelle un service distant)")
                    .isZero();
        }
        try (var ctx = start()) {
            assertThat(ExperimentalPricing.INSTANCES.get()).as("instances quand la fonctionnalité est active").isEqualTo(1);
        }
    }

    @Test
    @DisplayName("les valeurs booléennes de Spring sont reconnues (off, no, 0)")
    void springBooleanValues() {
        try (var ctx = start("tixa.features.loyalty", "off", "tixa.features.gift-cards", "no")) {
            assertThat(ctx.containsBean("loyaltyProgram")).as("loyaltyProgram avec la valeur off").isFalse();
            assertThat(ctx.containsBean("giftCards")).as("giftCards avec la valeur no").isFalse();
        }
    }

    @Test
    @DisplayName("disabledBeans() liste les beans retirés, triés")
    void reportsDisabledBeans() {
        try (var ctx = start("tixa.features.loyalty", "false", "tixa.features.gift-cards", "false",
                "tixa.features.experimental-pricing", "false")) {
            assertThat(ctx.getBean(FeatureTogglePostProcessor.class).disabledBeans())
                    .as("disabledBeans()")
                    .containsExactly("experimentalPricing", "giftCards", "loyaltyProgram");
        }
    }
}
