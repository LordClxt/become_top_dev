package app;

import org.springframework.boot.SpringApplication;

/** Prépare le démarrage de Tixa. */
public final class Launcher {
    private Launcher() { }

    /** Une SpringApplication pour TixaApp : sans bannière, sans serveur web, et qui note tout dans timeline. */
    public static SpringApplication create(Timeline timeline) {
        throw new UnsupportedOperationException("Launcher.create");
    }
}
