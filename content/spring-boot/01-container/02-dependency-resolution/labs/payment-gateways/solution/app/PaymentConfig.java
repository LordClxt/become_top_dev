package app;

import java.util.Map;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class PaymentConfig {

    // Deux candidats du même type : @Primary désigne celui qui gagne quand on en demande UN seul.
    @Bean
    @Primary
    PaymentGateway stripe() {
        return new Gateways.Stripe();
    }

    @Bean
    PaymentGateway paypal() {
        return new Gateways.Paypal();
    }

    @Bean
    Checkout checkout(PaymentGateway gateway) {
        return new Checkout(gateway);
    }

    // Map<String, T> : tous les beans du type, indexés par leur nom de bean.
    @Bean
    PaymentRouter paymentRouter(Map<String, PaymentGateway> gateways) {
        return new PaymentRouter(gateways);
    }

    // ObjectProvider : la dépendance peut manquer sans empêcher le démarrage.
    @Bean
    Refunds refunds(PaymentGateway gateway, ObjectProvider<FraudCheck> fraudCheck) {
        return new Refunds(gateway, fraudCheck);
    }
}
