package app;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.Banner;
import org.springframework.boot.WebApplicationType;

class TimelineTest {

    @Test
    @DisplayName("la SpringApplication est configurée : sans serveur web, sans bannière")
    void configured() {
        var app = Launcher.create(new Timeline());
        assertThat(app.getWebApplicationType()).as("type d'application web").isEqualTo(WebApplicationType.NONE);
        assertThat(app.getListeners()).as("écouteurs de la SpringApplication (la timeline doit y être)").anyMatch(l -> l instanceof Timeline);
    }

    @Test
    @DisplayName("la timeline voit tout le démarrage, du premier au dernier événement")
    void fullTimeline() {
        Timeline timeline = new Timeline();
        try (var ctx = Launcher.create(timeline).run()) {
            assertThat(timeline.entries()).as("chronologie du démarrage").isEqualTo(List.of(
                    "ApplicationStartingEvent", "ApplicationEnvironmentPreparedEvent", "ApplicationContextInitializedEvent",
                    "ApplicationPreparedEvent", "ContextRefreshedEvent", "ApplicationStartedEvent",
                    "catalogue préchauffé", "ApplicationReadyEvent"));
        }
    }

    @Test
    @DisplayName("un écouteur déclaré comme bean ne reçoit jamais ApplicationStartingEvent")
    void beanListenerTooLate() {
        LateListener.received = 0;
        try (var ctx = Launcher.create(new Timeline()).run()) {
            assertThat(LateListener.received).as("ApplicationStartingEvent reçus par un @Component (il n'existe pas encore)").isZero();
        }
    }
}
