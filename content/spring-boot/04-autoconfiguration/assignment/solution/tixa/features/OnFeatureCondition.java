package tixa.features;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.springframework.boot.autoconfigure.condition.ConditionMessage;
import org.springframework.boot.autoconfigure.condition.ConditionOutcome;
import org.springframework.boot.autoconfigure.condition.SpringBootCondition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.type.AnnotatedTypeMetadata;

/**
 * La condition derrière @ConditionalOnFeature. SpringBootCondition : l'issue et son message sont
 * enregistrés dans le rapport des conditions (--debug, /actuator/conditions).
 */
public class OnFeatureCondition extends SpringBootCondition {

    @Override
    public ConditionOutcome getMatchOutcome(ConditionContext context, AnnotatedTypeMetadata metadata) {
        Map<String, Object> attributes = metadata.getAnnotationAttributes(ConditionalOnFeature.class.getName());
        String feature = (String) attributes.get("value");
        List<String> enabled = Arrays.stream(context.getEnvironment().getProperty("tixa.features", "").split(","))
                .map(String::trim).filter(s -> !s.isEmpty()).toList();
        ConditionMessage.Builder message = ConditionMessage.forCondition(ConditionalOnFeature.class, feature);
        if (enabled.contains(feature)) {
            return ConditionOutcome.match(message.because("tixa.features contient " + feature));
        }
        return ConditionOutcome.noMatch(message.because("tixa.features ne contient pas " + feature
                + " (actives : " + (enabled.isEmpty() ? "aucune" : String.join(", ", enabled)) + ")"));
    }
}
