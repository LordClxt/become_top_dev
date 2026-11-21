package app;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Stream;

import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

/**
 * Lit les secrets montés en fichiers (un fichier par propriété, comme un volume de secrets Kubernetes).
 * Tourne après ConfigDataEnvironmentPostProcessor : tixa.secrets-dir peut venir d'un document de profil,
 * et ses placeholders sont déjà résolvables.
 */
public class SecretsLoader implements EnvironmentPostProcessor {
    static final String NAME = "tixaSecrets";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String dir = environment.getProperty("tixa.secrets-dir");
        if (dir == null || dir.isBlank()) return;
        Path root = Path.of(dir);
        if (!Files.isDirectory(root)) {
            throw new IllegalStateException("dossier de secrets introuvable : " + root);
        }
        Map<String, Object> secrets = new LinkedHashMap<>();
        try (Stream<Path> files = Files.list(root)) {
            files.filter(Files::isRegularFile)
                    .filter(f -> !f.getFileName().toString().startsWith("."))   // ..data, .gitkeep…
                    .sorted()
                    .forEach(f -> secrets.put(f.getFileName().toString(), read(f)));
        } catch (IOException e) {
            throw new UncheckedIOException("lecture impossible du dossier de secrets " + root, e);
        }
        // Juste après les variables d'environnement : la ligne de commande, les propriétés système et
        // l'environnement l'emportent (dépannage) ; les secrets l'emportent sur tous les fichiers de configuration.
        environment.getPropertySources().addAfter(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                new MapPropertySource(NAME, secrets));
    }

    private static String read(Path file) {
        try {
            return Files.readString(file, StandardCharsets.UTF_8).strip();   // un éditeur ajoute souvent un saut de ligne
        } catch (IOException e) {
            throw new UncheckedIOException("lecture impossible du secret " + file.getFileName(), e);
        }
    }
}
