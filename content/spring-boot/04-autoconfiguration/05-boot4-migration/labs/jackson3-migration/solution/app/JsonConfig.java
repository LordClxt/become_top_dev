package app;

import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import tools.jackson.databind.PropertyNamingStrategies;

/**
 * Le partenaire exige des noms en snake_case. Spring Boot 4 : Jackson 3 (paquet tools.jackson), et le
 * customizer du JsonMapper vit dans le module spring-boot-jackson.
 */
@Configuration
public class JsonConfig {

    @Bean
    JsonMapperBuilderCustomizer snakeCase() {
        return builder -> builder.propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
    }
}
