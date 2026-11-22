package app;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Le partenaire exige des noms en snake_case. Écrit pour Spring Boot 3. */
@Configuration
public class JsonConfig {

    @Bean
    Jackson2ObjectMapperBuilderCustomizer snakeCase() {
        return builder -> builder.propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
    }
}
