package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.context.ConfigurableApplicationContext;

class SecretsTest {

    static ConfigurableApplicationContext start(String... args) {
        var app = new SpringApplication(TixaApp.class);
        app.setBannerMode(Banner.Mode.OFF);
        app.setWebApplicationType(WebApplicationType.NONE);
        return app.run(args);
    }

    /** Un dossier de secrets : nom de fichier = propriété, contenu = valeur. */
    static Path secrets(String... nameAndValue) throws Exception {
        Path dir = Files.createTempDirectory("secrets");
        for (int i = 0; i < nameAndValue.length; i += 2) Files.writeString(dir.resolve(nameAndValue[i]), nameAndValue[i + 1]);
        return dir;
    }

    @AfterEach
    void cleanSystemProperties() {
        System.clearProperty("tixa.payment.api-key");
    }

    @Test
    @DisplayName("sans dossier de secrets : la configuration de développement")
    void noSecrets() {
        try (var ctx = start()) {
            assertThat(ctx.getEnvironment().getProperty("tixa.payment.api-key")).as("clé sans secrets").isEqualTo("dev-key-not-secret");
            assertThat(ctx.getEnvironment().getPropertySources().contains("tixaSecrets")).as("source tixaSecrets sans dossier").isFalse();
        }
    }

    @Test
    @DisplayName("un secret remplace la valeur de application.yml, sans son saut de ligne final")
    void secretOverridesConfigFile() throws Exception {
        Path dir = secrets("tixa.payment.api-key", "sk_live_123\n");
        try (var ctx = start("--tixa.secrets-dir=" + dir)) {
            assertThat(ctx.getEnvironment().getProperty("tixa.payment.api-key")).as("clé lue dans le secret").isEqualTo("sk_live_123");
        }
    }

    @Test
    @DisplayName("la ligne de commande et les propriétés système l'emportent sur un secret")
    void overridesForTroubleshooting() throws Exception {
        Path dir = secrets("tixa.payment.api-key", "sk_live_123");
        try (var ctx = start("--tixa.secrets-dir=" + dir, "--tixa.payment.api-key=sk_cli")) {
            assertThat(ctx.getEnvironment().getProperty("tixa.payment.api-key")).as("clé avec --tixa.payment.api-key").isEqualTo("sk_cli");
        }
        System.setProperty("tixa.payment.api-key", "sk_sysprop");
        try (var ctx = start("--tixa.secrets-dir=" + dir)) {
            assertThat(ctx.getEnvironment().getProperty("tixa.payment.api-key")).as("clé avec -Dtixa.payment.api-key").isEqualTo("sk_sysprop");
        }
    }

    @Test
    @DisplayName("le dossier peut venir d'un profil, avec un placeholder")
    void dirFromProfile() throws Exception {
        Path root = Files.createTempDirectory("root");
        Files.createDirectories(root.resolve("prod"));
        Files.writeString(root.resolve("prod/tixa.payment.api-key"), "sk_prod");
        try (var ctx = start("--spring.profiles.active=prod", "--tixa.secrets-root=" + root)) {
            assertThat(ctx.getEnvironment().getProperty("tixa.payment.api-key")).as("clé en prod").isEqualTo("sk_prod");
            assertThat(ctx.getEnvironment().getProperty("tixa.payment.endpoint")).as("endpoint en prod").isEqualTo("https://bank.example");
        }
    }

    @Test
    @DisplayName("les fichiers cachés du dossier sont ignorés")
    void hiddenFilesIgnored() throws Exception {
        Path dir = secrets(".tixa.payment.api-key", "piège", "tixa.payment.endpoint", "https://other.example");
        try (var ctx = start("--tixa.secrets-dir=" + dir)) {
            assertThat(ctx.getEnvironment().getProperty("tixa.payment.api-key")).as("clé (seul un fichier caché la définit)").isEqualTo("dev-key-not-secret");
            assertThat(ctx.getEnvironment().getProperty("tixa.payment.endpoint")).as("endpoint lu dans le secret").isEqualTo("https://other.example");
        }
    }

    @Test
    @DisplayName("la source des secrets passe juste après les variables d'environnement")
    void position() throws Exception {
        Path dir = secrets("tixa.payment.api-key", "sk");
        try (var ctx = start("--tixa.secrets-dir=" + dir)) {
            List<String> names = new ArrayList<>();
            ctx.getEnvironment().getPropertySources().forEach(ps -> names.add(ps.getName()));
            assertThat(names.indexOf("tixaSecrets")).as("position de tixaSecrets dans " + names)
                    .isEqualTo(names.indexOf("systemEnvironment") + 1);
        }
    }

    @Test
    @DisplayName("un dossier de secrets introuvable fait échouer le démarrage")
    void missingDirFails() {
        assertThatThrownBy(() -> start("--tixa.secrets-dir=/nulle/part").close()).as("dossier introuvable")
                .hasStackTraceContaining("dossier de secrets introuvable : /nulle/part");
    }
}
