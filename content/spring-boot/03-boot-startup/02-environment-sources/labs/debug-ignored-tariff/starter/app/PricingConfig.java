package app;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;

/** Charge la grille tarifaire de l'équipe finance. */
@Configuration
@PropertySource("classpath:fees.properties")
public class PricingConfig { }
