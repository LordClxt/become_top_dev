package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.aop.Advisor;
import org.springframework.aop.PointcutAdvisor;
import org.springframework.aop.support.AopUtils;

class RetryAdvisorTest {

    /** Chaque lecture avance de 10 ms. */
    static Ticker clock() {
        AtomicLong t = new AtomicLong();
        return () -> t.getAndAdd(10);
    }

    @Test
    @DisplayName("RetryAdvisor est un PointcutAdvisor qui ne vise que les méthodes @Retry")
    void advisorMatchesOnlyAnnotated() throws Exception {
        Object advisor = new RetryAdvisor();
        assertThat(advisor).as("RetryAdvisor doit être un org.springframework.aop.PointcutAdvisor").isInstanceOf(PointcutAdvisor.class);
        var pointcut = ((PointcutAdvisor) advisor).getPointcut();
        var charge = PaymentClient.class.getMethod("charge", String.class, int.class);
        var refund = PaymentClient.class.getMethod("refund", String.class);
        assertThat(AopUtils.canApply(pointcut, FlakyPaymentClient.class)).as("le pointcut s'applique à FlakyPaymentClient").isTrue();
        assertThat(pointcut.getMethodMatcher().matches(charge, FlakyPaymentClient.class))
                .as("charge (annotée @Retry sur l'implémentation) doit être visée").isTrue();
        assertThat(pointcut.getMethodMatcher().matches(refund, FlakyPaymentClient.class)).as("refund ne doit pas être visée").isFalse();
    }

    @Test
    @DisplayName("une méthode @Retry est réessayée jusqu'au succès")
    void retriesUntilSuccess() {
        var target = new FlakyPaymentClient(2);
        PaymentClient client = Chains.resilient(target, clock(), new Metrics());
        assertThat(client.charge("k1", 4500)).as("charge après deux échecs").isEqualTo("pay-k1");
        assertThat(target.charges).as("tentatives de charge").isEqualTo(3);
    }

    @Test
    @DisplayName("au-delà du nombre de tentatives, la dernière exception remonte")
    void givesUp() {
        var target = new FlakyPaymentClient(5);
        PaymentClient client = Chains.resilient(target, clock(), new Metrics());
        assertThatThrownBy(() -> client.charge("k2", 100)).as("charge avec 5 échecs et 3 tentatives")
                .isExactlyInstanceOf(IllegalStateException.class).hasMessage("prestataire indisponible");
        assertThat(target.charges).as("tentatives de charge").isEqualTo(3);
    }

    @Test
    @DisplayName("une méthode sans @Retry n'est jamais réessayée")
    void refundNotRetried() {
        var target = new FlakyPaymentClient(1);
        PaymentClient client = Chains.resilient(target, clock(), new Metrics());
        assertThatThrownBy(() -> client.refund("p1")).as("refund en échec").isInstanceOf(IllegalStateException.class);
        assertThat(target.refunds).as("tentatives de remboursement (non idempotent)").isEqualTo(1);
    }

    @Test
    @DisplayName("la mesure enveloppe le retry : une seule mesure par appel, tentatives comprises")
    void timingWrapsRetry() {
        var target = new FlakyPaymentClient(2);
        Metrics metrics = new Metrics();
        PaymentClient client = Chains.resilient(target, clock(), metrics);
        client.charge("k3", 100);
        assertThat(metrics.lines()).as("mesures après un appel réussi à la 3e tentative").containsExactly("FlakyPaymentClient.charge 10");
    }

    @Test
    @DisplayName("le proxy porte deux advisors, mesure d'abord, retry ensuite")
    void advisorOrder() {
        PaymentClient client = Chains.resilient(new FlakyPaymentClient(0), clock(), new Metrics());
        Advisor[] advisors = ((org.springframework.aop.framework.Advised) client).getAdvisors();
        assertThat(advisors).as("advisors du proxy").hasSize(2);
        assertThat(advisors[1]).as("le second advisor doit être le RetryAdvisor").isInstanceOf(RetryAdvisor.class);
    }
}
