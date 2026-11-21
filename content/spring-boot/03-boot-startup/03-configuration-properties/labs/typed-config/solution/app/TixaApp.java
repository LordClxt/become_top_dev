package app;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
// Trouve les classes @ConfigurationProperties du paquet et les enregistre comme beans.
@ConfigurationPropertiesScan
public class TixaApp { }
