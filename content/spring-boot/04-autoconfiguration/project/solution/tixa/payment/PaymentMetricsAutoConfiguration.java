package tixa.payment;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;

import tixa.metrics.MeterSink;

/**
 * Enregistre les métriques du client, si la bibliothèque de métriques est présente. after : sinon l'ordre
 * alphabétique (« PaymentAutoConfiguration » < « PaymentMetrics… » ici, mais rien ne le garantit en général)
 * déciderait si @ConditionalOnBean voit le client.
 */
@AutoConfiguration(after = PaymentAutoConfiguration.class)
@ConditionalOnClass(MeterSink.class)
public class PaymentMetricsAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    MeterSink meterSink() { return new MeterSink(); }

    @Bean
    @ConditionalOnBean(PaymentClient.class)
    PaymentMetrics paymentMetrics(PaymentClient client, MeterSink sink) { return new PaymentMetrics(client, sink); }
}
