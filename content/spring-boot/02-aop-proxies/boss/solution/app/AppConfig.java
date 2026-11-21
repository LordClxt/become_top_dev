package app;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.EnableAspectJAutoProxy;
import org.springframework.context.annotation.Import;
import org.springframework.resilience.annotation.EnableResilientMethods;
import org.springframework.transaction.PlatformTransactionManager;

@Configuration
@ComponentScan
@Import(DataConfig.class)
@EnableAspectJAutoProxy
// Le conseil de @Retryable est inséré en tête de la chaîne : il enveloppe AtomicAspect,
// donc chaque tentative ouvre (et annule) sa propre transaction.
@EnableResilientMethods
public class AppConfig {

    @Bean
    AtomicAspect atomicAspect(PlatformTransactionManager transactions) {
        return new AtomicAspect(transactions);
    }
}
