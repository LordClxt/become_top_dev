package app;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Fourni : ne pas modifier. */
@Configuration
public class AuditConfig {

    @Bean
    AuditLog auditLog() { return new AuditLog(); }

    @Bean
    OrderService orderService() { return new OrderService(); }

    @Bean
    PricingService pricingService() { return new PricingService(); }

    @Bean
    Checkout checkout(Orders orders, Pricing pricing) { return new Checkout(orders, pricing); }

    // ObjectProvider : le journal n'est créé qu'au premier appel audité, pas pendant l'enregistrement des post-processors.
    @Bean
    static AuditBeanPostProcessor auditBeanPostProcessor(ObjectProvider<AuditLog> auditLog) {
        return new AuditBeanPostProcessor(auditLog);
    }
}
