package app;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.context.annotation.Bean;

@AutoConfiguration
public class PaymentAutoConfiguration {

    @Bean
    PaymentGateway lydiaGateway() {
        return () -> "lydia";
    }

    @Bean
    PaymentGateway fakeGateway() {
        return () -> "factice";
    }

    @Bean
    AuditLog auditLog() {
        return new AuditLog();
    }
}
