package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

class PaymentTest {

    static AnnotationConfigApplicationContext start() {
        return new AnnotationConfigApplicationContext(PaymentConfig.class);
    }

    @Test
    @DisplayName("Checkout paie avec Stripe, le prestataire par défaut")
    void checkoutUsesDefault() {
        try (var ctx = start()) {
            assertThat(ctx.getBean(Checkout.class).pay(4500))
                    .as("transaction renvoyée par Checkout.pay(4500)")
                    .isEqualTo("stripe-4500");
        }
    }

    @Test
    @DisplayName("PaymentRouter retrouve un prestataire par son nom de bean")
    void routerByName() {
        try (var ctx = start()) {
            PaymentRouter router = ctx.getBean(PaymentRouter.class);
            assertThat(router.charge("paypal", 1000)).as("charge(\"paypal\", 1000)").isEqualTo("paypal-1000");
            assertThat(router.charge("stripe", 1000)).as("charge(\"stripe\", 1000)").isEqualTo("stripe-1000");
        }
    }

    @Test
    @DisplayName("moyen inconnu : erreur claire qui liste les moyens disponibles")
    void unknownMethod() {
        try (var ctx = start()) {
            PaymentRouter router = ctx.getBean(PaymentRouter.class);
            assertThatThrownBy(() -> router.charge("bitcoin", 1000))
                    .as("charge(\"bitcoin\", 1000)")
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("moyen de paiement inconnu : bitcoin (disponibles : paypal, stripe)");
        }
    }

    @Test
    @DisplayName("un prestataire ajouté au conteneur est routable sans toucher au routeur")
    void routerSeesNewBeans() {
        try (var ctx = new AnnotationConfigApplicationContext()) {
            ctx.register(PaymentConfig.class);
            ctx.registerBean("lydia", PaymentGateway.class, () -> amount -> "lydia-" + amount);
            ctx.refresh();
            assertThat(ctx.getBean(PaymentRouter.class).charge("lydia", 700))
                    .as("charge(\"lydia\", 700) après l'ajout d'un bean nommé lydia")
                    .isEqualTo("lydia-700");
        }
    }

    @Test
    @DisplayName("sans contrôle anti-fraude, l'application démarre et rembourse")
    void refundWithoutFraudCheck() {
        try (var ctx = start()) {
            assertThat(ctx.getBeanNamesForType(FraudCheck.class))
                    .as("beans FraudCheck dans la configuration de base (n'en invente pas un faux)")
                    .isEmpty();
            assertThat(ctx.getBean(Refunds.class).refund(2000)).as("refund(2000)").isEqualTo("stripe--2000");
        }
    }

    @Test
    @DisplayName("avec un contrôle anti-fraude, un remboursement refusé est bloqué")
    void refundWithFraudCheck() {
        try (var ctx = new AnnotationConfigApplicationContext()) {
            ctx.register(PaymentConfig.class);
            ctx.registerBean(FraudCheck.class, () -> amount -> amount <= 10_000);
            ctx.refresh();
            Refunds refunds = ctx.getBean(Refunds.class);
            assertThat(refunds.refund(5000)).as("refund(5000), autorisé").isEqualTo("stripe--5000");
            assertThatThrownBy(() -> refunds.refund(20_000))
                    .as("refund(20000), refusé par le contrôle")
                    .isInstanceOf(IllegalStateException.class);
        }
    }
}
