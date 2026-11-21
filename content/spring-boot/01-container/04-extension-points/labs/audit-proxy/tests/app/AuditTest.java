package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.lang.reflect.Proxy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

class AuditTest {

    @Test
    @DisplayName("les appels à un bean @Audited sont journalisés")
    void auditedCallsAreRecorded() {
        try (var ctx = new AnnotationConfigApplicationContext(AuditConfig.class)) {
            Orders orders = ctx.getBean(Orders.class);
            assertThat(orders.place("jazz", 2)).as("place(\"jazz\", 2)").isEqualTo("order:jazzx2");
            assertThat(ctx.getBean(AuditLog.class).entries())
                    .as("journal d'audit après un appel à place")
                    .containsExactly("OrderService.place");
        }
    }

    @Test
    @DisplayName("le bean audité est remplacé par un proxy JDK")
    void auditedBeanIsAJdkProxy() {
        try (var ctx = new AnnotationConfigApplicationContext(AuditConfig.class)) {
            assertThat(Proxy.isProxyClass(ctx.getBean("orderService").getClass()))
                    .as("le bean orderService doit être un java.lang.reflect.Proxy")
                    .isTrue();
        }
    }

    @Test
    @DisplayName("les beans non audités sont rendus tels quels")
    void otherBeansUntouched() {
        try (var ctx = new AnnotationConfigApplicationContext(AuditConfig.class)) {
            assertThat(ctx.getBean("pricingService"))
                    .as("pricingService, non annoté : même classe, pas de proxy")
                    .isExactlyInstanceOf(PricingService.class);
        }
    }

    @Test
    @DisplayName("les beans qui en dépendent reçoivent le proxy")
    void dependentsGetTheProxy() {
        try (var ctx = new AnnotationConfigApplicationContext(AuditConfig.class)) {
            assertThat(ctx.getBean(Checkout.class).buy("rock", 3)).as("buy(\"rock\", 3)").isEqualTo("order:rockx3@13500");
            assertThat(ctx.getBean(AuditLog.class).entries())
                    .as("journal après un achat via Checkout (seul OrderService est audité)")
                    .containsExactly("OrderService.place");
        }
    }

    @Test
    @DisplayName("une erreur métier traverse le proxy sans être déguisée")
    void exceptionsAreNotWrapped() {
        try (var ctx = new AnnotationConfigApplicationContext(AuditConfig.class)) {
            Orders orders = ctx.getBean(Orders.class);
            assertThatThrownBy(() -> orders.place("jazz", 0))
                    .as("place(\"jazz\", 0) doit lever l'IllegalArgumentException d'origine")
                    .isExactlyInstanceOf(IllegalArgumentException.class)
                    .hasMessage("nombre de places invalide : 0");
            assertThat(Proxy.isProxyClass(orders.getClass())).as("Orders doit passer par le proxy").isTrue();
        }
    }

    @Test
    @DisplayName("toString, equals et hashCode ne polluent pas le journal")
    void objectMethodsNotAudited() {
        try (var ctx = new AnnotationConfigApplicationContext(AuditConfig.class)) {
            Orders orders = ctx.getBean(Orders.class);
            String s = orders.toString();
            orders.hashCode();
            assertThat(s).as("toString du proxy (délégué au vrai objet)").isEqualTo("OrderService");
            assertThat(Proxy.isProxyClass(orders.getClass())).as("Orders doit passer par le proxy").isTrue();
            assertThat(ctx.getBean(AuditLog.class).entries()).as("journal après toString et hashCode").isEmpty();
        }
    }
}
