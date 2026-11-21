package app;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/** Les deux prestataires : un faux pour le développement, le vrai pour la production. */
@Configuration
public class Banks {

    @Bean
    @Profile("!prod")
    Bank fakeBank() {
        return new Bank() {
            public String name() { return "factice"; }
            public boolean ping() { return true; }
        };
    }

    @Bean
    @Profile("prod")
    Bank liveBank(TixaProperties props) {
        String url = props.bankUrl();
        if (url == null || url.isBlank()) {
            throw new IllegalStateException("tixa.bank-url est obligatoire en production");
        }
        return new Bank() {
            public String name() { return "live " + url; }
            public boolean ping() { return url.startsWith("https://"); }
        };
    }
}
