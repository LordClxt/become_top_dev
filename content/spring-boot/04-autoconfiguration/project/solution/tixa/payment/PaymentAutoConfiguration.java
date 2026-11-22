package tixa.payment;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

/** Fournit le PaymentClient quand une clé d'API est configurée, sauf si l'application a le sien. */
@AutoConfiguration
@EnableConfigurationProperties(PaymentProperties.class)
public class PaymentAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty("tixa.payment.api-key")   // présente et différente de false
    PaymentClient paymentClient(PaymentProperties props, ObjectProvider<PaymentClientCustomizer> customizers) {
        List<String> headers = new ArrayList<>();
        customizers.orderedStream().forEach(c -> c.customize(headers));
        return new PaymentClient(props.endpoint(), props.apiKey(), headers);
    }
}
