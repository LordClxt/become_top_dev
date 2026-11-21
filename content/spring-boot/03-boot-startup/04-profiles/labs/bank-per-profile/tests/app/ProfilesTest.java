package app;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.context.ConfigurableApplicationContext;

class ProfilesTest {

    static ConfigurableApplicationContext start(String... args) {
        var app = new SpringApplication(TixaApp.class);
        app.setBannerMode(Banner.Mode.OFF);
        app.setWebApplicationType(WebApplicationType.NONE);
        return app.run(args);
    }

    @Test
    @DisplayName("sans profil : la banque factice, et aucune URL n'est exigée")
    void defaultIsFake() {
        try (var ctx = start()) {
            assertThat(ctx.getBean(BankClient.class).describe()).as("banque sans profil").isEqualTo("factice");
        }
    }

    @Test
    @DisplayName("prod : la vraie banque, région eu")
    void prodIsLive() {
        try (var ctx = start("--spring.profiles.active=prod", "--tixa.bank.url=https://bank.example")) {
            assertThat(ctx.getBean(BankClient.class).describe()).as("banque en prod").isEqualTo("live eu https://bank.example");
        }
    }

    @Test
    @DisplayName("staging : un groupe qui active prod et us")
    void stagingGroup() {
        try (var ctx = start("--spring.profiles.active=staging", "--tixa.bank.url=https://staging.example")) {
            assertThat(ctx.getEnvironment().getActiveProfiles()).as("profils actifs").containsExactly("staging", "prod", "us");
            assertThat(ctx.getBean(BankClient.class).describe()).as("banque en staging").isEqualTo("live us https://staging.example");
        }
    }

    @Test
    @DisplayName("us seul : la banque factice, région us dans la configuration")
    void usAlone() {
        try (var ctx = start("--spring.profiles.active=us")) {
            assertThat(ctx.getBean(BankClient.class).describe()).as("banque avec us seul").isEqualTo("factice");
            assertThat(ctx.getEnvironment().getProperty("tixa.bank.region")).as("tixa.bank.region avec us").isEqualTo("us");
        }
    }

    @Test
    @DisplayName("prod sans URL : le démarrage échoue")
    void prodWithoutUrlFails() {
        assertThatThrownBy(() -> start("--spring.profiles.active=prod").close()).as("prod sans tixa.bank.url")
                .hasStackTraceContaining("tixa.bank.url");
    }
}
