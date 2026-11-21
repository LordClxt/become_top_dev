package app;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

@Configuration
@ComponentScan
@EnableAspectJAutoProxy
public class AopConfig {
    @Bean Trace trace() { return new Trace(); }
    @Bean RetryAspect retryAspect(Trace trace) { return new RetryAspect(trace); }
    @Bean TimingAspect timingAspect(Trace trace) { return new TimingAspect(trace); }
    // TODO : l'aspect d'audit
}
