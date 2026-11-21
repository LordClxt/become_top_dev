package app;

import org.springframework.boot.diagnostics.AbstractFailureAnalyzer;
import org.springframework.boot.diagnostics.FailureAnalysis;

/**
 * Transforme une MissingSecretException en un rapport de démarrage clair. AbstractFailureAnalyzer cherche
 * l'exception du type voulu dans toute la chaîne des causes (elle arrive enveloppée dans une BeanCreationException).
 */
public class MissingSecretFailureAnalyzer extends AbstractFailureAnalyzer<MissingSecretException> {

    @Override
    protected FailureAnalysis analyze(Throwable rootFailure, MissingSecretException cause) {
        String description = "Le secret '" + cause.property() + "' n'est pas configuré : Tixa ne peut pas joindre son prestataire.";
        String action = "Définis la variable d'environnement " + cause.envVariable()
                + " (ou la propriété " + cause.property() + "). Ne l'écris jamais dans application.yml : il serait versionné.";
        return new FailureAnalysis(description, action, cause);
    }
}
