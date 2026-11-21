package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.diagnostics.FailureAnalysis;
import org.springframework.boot.diagnostics.FailureAnalyzer;
import org.springframework.core.io.support.SpringFactoriesLoader;

class FailureAnalyzerTest {

    static Throwable startFailure(String... args) {
        var app = new SpringApplication(TixaApp.class);
        app.setBannerMode(Banner.Mode.OFF);
        app.setWebApplicationType(WebApplicationType.NONE);
        return catchThrowable(() -> app.run(args).close());
    }

    static List<FailureAnalyzer> registeredAnalyzers() {
        // Certains analyseurs de Spring Boot exigent une fabrique de beans en argument : on ignore ceux-là ici.
        return SpringFactoriesLoader.forDefaultResourceLocation().load(FailureAnalyzer.class, (type, name, failure) -> { });
    }

    static FailureAnalysis analyzeWithRegistered(Throwable failure) {
        for (FailureAnalyzer analyzer : registeredAnalyzers()) {
            if (analyzer instanceof MissingSecretFailureAnalyzer) {
                FailureAnalysis analysis = analyzer.analyze(failure);
                if (analysis != null) return analysis;
            }
        }
        return null;
    }

    @Test
    @DisplayName("l'analyseur est enregistré dans spring.factories")
    void registered() {
        assertThat(registeredAnalyzers()).as("analyseurs déclarés dans META-INF/spring.factories")
                .anyMatch(a -> a instanceof MissingSecretFailureAnalyzer);
    }

    @Test
    @DisplayName("le vrai échec de démarrage est reconnu, même enveloppé par le conteneur")
    void recognizesWrappedFailure() {
        Throwable failure = startFailure();
        assertThat(failure).as("le démarrage sans clé doit échouer").isNotNull();
        FailureAnalysis analysis = analyzeWithRegistered(failure);
        assertThat(analysis).as("analyse de l'échec réel (la MissingSecretException est une cause, pas l'exception levée)").isNotNull();
        assertThat(analysis.getCause()).as("cause de l'analyse").isInstanceOf(MissingSecretException.class);
    }

    @Test
    @DisplayName("la description nomme le secret, l'action donne la variable d'environnement")
    void messages() {
        FailureAnalysis analysis = analyzeWithRegistered(startFailure());
        assertThat(analysis).as("analyse").isNotNull();
        assertThat(analysis.getDescription()).as("description").contains("tixa.payment.api-key");
        assertThat(analysis.getAction()).as("action").contains("TIXA_PAYMENT_APIKEY");
    }

    @Test
    @DisplayName("une autre erreur n'est pas récupérée par cet analyseur")
    void ignoresOtherFailures() {
        FailureAnalysis analysis = analyzeWithRegistered(new IllegalStateException("autre chose"));
        assertThat(analysis).as("analyse d'une IllegalStateException sans rapport").isNull();
    }

    @Test
    @DisplayName("avec la clé, l'application démarre")
    void startsWithKey() {
        assertThat(startFailure("--tixa.payment.api-key=sk_test")).as("échec avec une clé").isNull();
    }
}
