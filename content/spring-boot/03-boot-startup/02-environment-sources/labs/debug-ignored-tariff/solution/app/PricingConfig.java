package app;

import org.springframework.context.annotation.Configuration;

/**
 * La grille de la finance est importée par application.yml (spring.config.import) : elle devient une source de
 * configuration à part entière. Une @PropertySource, elle, passe après tous les fichiers application.*.
 */
@Configuration
public class PricingConfig { }
