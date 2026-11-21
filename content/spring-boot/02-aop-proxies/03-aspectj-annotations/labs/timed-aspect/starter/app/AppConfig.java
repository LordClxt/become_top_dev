package app;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@ComponentScan
public class AppConfig {

    @Bean
    Metrics metrics() { return new Metrics(); }

    // TODO : activer l'auto-proxy AspectJ et déclarer l'aspect
}
