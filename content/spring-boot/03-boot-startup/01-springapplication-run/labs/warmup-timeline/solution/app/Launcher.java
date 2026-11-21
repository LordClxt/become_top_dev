package app;

import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;

/** Prépare le démarrage de Tixa. */
public final class Launcher {
    private Launcher() { }

    public static SpringApplication create(Timeline timeline) {
        SpringApplication app = new SpringApplication(TixaApp.class);
        app.setBannerMode(Banner.Mode.OFF);
        app.setWebApplicationType(WebApplicationType.NONE);
        // Ajouté à la SpringApplication, pas au contexte : il existe avant le contexte, donc voit les premiers événements.
        app.addListeners(timeline);
        // Le même objet, aussi comme bean : le runner peut y écrire.
        app.addInitializers(ctx -> ctx.getBeanFactory().registerSingleton("timeline", timeline));
        return app;
    }
}
