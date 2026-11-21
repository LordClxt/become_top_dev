package app;

import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.context.ConfigurableApplicationContext;

final class Tixa {
    private Tixa() { }

    static ConfigurableApplicationContext start(String... args) {
        var app = new SpringApplication(TixaApp.class);
        app.setBannerMode(Banner.Mode.OFF);
        app.setWebApplicationType(WebApplicationType.NONE);
        return app.run(args);
    }
}
