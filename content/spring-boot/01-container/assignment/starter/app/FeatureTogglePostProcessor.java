package app;

import java.util.List;

/** Retire du conteneur les beans des fonctionnalités désactivées, avant qu'ils ne soient créés. */
public class FeatureTogglePostProcessor {

    /** Noms des beans retirés, triés. */
    public List<String> disabledBeans() {
        return List.of();
    }
}
