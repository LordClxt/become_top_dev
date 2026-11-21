package app;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class PaymentConfig {

    @Bean
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

    @Bean
    PaymentRouter paymentRouter(java.util.List<PaymentGateway> gateways) {
        return new PaymentRouter(gateways);
    }

    @Bean
    Refunds refunds(PaymentGateway gateway, FraudCheck fraudCheck) {
        return new Refunds(gateway, fraudCheck);
    }
}
