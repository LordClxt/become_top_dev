package app;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

@Configuration
@ComponentScan
// Enregistre AnnotationAwareAspectJAutoProxyCreator : un BeanPostProcessor qui transforme les @Aspect en advisors.
@EnableAspectJAutoProxy
public class AppConfig {

    @Bean
    Metrics metrics() { return new Metrics(); }

    // Un @Aspect doit être un bean : l'annotation seule ne le déclare pas.
    @Bean
    TimedAspect timedAspect(Metrics metrics, Ticker ticker) { return new TimedAspect(metrics, ticker); }
}
