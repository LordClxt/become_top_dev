package app;

import java.util.Map;

import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * Ajoute à l'environnement les valeurs par défaut de la région (tixa.region).
 * Appelé après ConfigDataEnvironmentPostProcessor : application.yml et les profils sont déjà lus.
 */
public class RegionDefaults implements EnvironmentPostProcessor {
    static final String NAME = "tixaRegionDefaults";

    private static final Map<String, Map<String, Object>> REGIONS = Map.of(
            "eu", Map.of("tixa.currency", "EUR", "tixa.time-zone", "Europe/Paris"),
            "us", Map.of("tixa.currency", "USD", "tixa.time-zone", "America/New_York"));

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String region = environment.getProperty("tixa.region", "eu");
        Map<String, Object> defaults = REGIONS.get(region);
        if (defaults == null) {
            throw new IllegalStateException("région inconnue : " + region + " (connues : eu, us)");
        }
        // addLast : après les fichiers, l'environnement et la ligne de commande. (Spring Boot replacera ensuite
        // ses defaultProperties tout à la fin : elles restent les seules valeurs moins prioritaires que celles-ci.)
        environment.getPropertySources().addLast(new MapPropertySource(NAME, defaults));
    }
}
