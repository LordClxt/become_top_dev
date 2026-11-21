package app;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;

import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.env.MapPropertySource;

/** Démarre Tixa pour les tests, avec une horloge fixe prioritaire sur celle de TixaConfig. */
final class Tixa {
    static final Instant NOW = Instant.parse("2026-06-12T18:00:00Z");

    @Configuration
    static class FixedClock {
        @Bean
        @Primary
        Clock fixedClock() { return Clock.fixed(NOW, ZoneOffset.UTC); }
    }

    static AnnotationConfigApplicationContext start(String... keyValues) {
        Map<String, Object> props = new HashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) props.put(keyValues[i], keyValues[i + 1]);
        var ctx = new AnnotationConfigApplicationContext();
        ctx.getEnvironment().getPropertySources().addFirst(new MapPropertySource("test", props));
        ctx.register(TixaConfig.class, FixedClock.class);
        ctx.refresh();
        return ctx;
    }

    private Tixa() { }
}
