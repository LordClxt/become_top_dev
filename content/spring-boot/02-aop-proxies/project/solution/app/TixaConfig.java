package app;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.resilience.annotation.EnableResilientMethods;

@Configuration
@ComponentScan
@EnableAspectJAutoProxy
@EnableResilientMethods
public class TixaConfig {

    @Bean AuditLog auditLog() { return new AuditLog(); }

    @Bean Bank bank() { return new Bank(); }

    @Bean AuditAspect auditAspect(AuditLog log) { return new AuditAspect(log); }
}
