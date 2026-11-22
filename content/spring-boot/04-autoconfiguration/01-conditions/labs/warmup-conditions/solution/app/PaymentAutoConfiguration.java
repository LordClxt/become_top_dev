package app;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBooleanProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@AutoConfiguration
public class PaymentAutoConfiguration {

    // Une classe imbriquée : la condition sur la classe est évaluée AVANT de lire la méthode,
    // donc sans jamais charger une signature qui mentionnerait une classe absente.
    @Configuration(proxyBeanMethods = false)
    @ConditionalOnClass(name = "sdk.lydia.LydiaSdk")
    static class LydiaConfiguration {
        @Bean
        PaymentGateway lydiaGateway() {
            return () -> "lydia";
        }
    }

    // Repli : seulement si personne (ni l'application, ni Lydia) n'a fourni de prestataire.
    @Bean
    @ConditionalOnMissingBean(PaymentGateway.class)
    PaymentGateway fakeGateway() {
        return () -> "factice";
    }

    @Bean
    @ConditionalOnBooleanProperty("tixa.audit.enabled")
    AuditLog auditLog() {
        return new AuditLog();
    }
}
