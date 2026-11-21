package app;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@ComponentScan
public class TixaConfig {

    @Bean AuditLog auditLog() { return new AuditLog(); }

    @Bean Bank bank() { return new Bank(); }

    // TODO (M1, M2)
}
