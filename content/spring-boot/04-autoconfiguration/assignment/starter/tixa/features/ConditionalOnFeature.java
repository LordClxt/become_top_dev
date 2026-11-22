package tixa.features;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.context.annotation.Conditional;

/**
 * Le bean (ou la configuration) n'existe que si la fonctionnalité est listée dans tixa.features,
 * une liste séparée par des virgules (« loyalty, gift-cards »). Fourni : ne pas modifier.
 */
@Target({ ElementType.TYPE, ElementType.METHOD })
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Conditional(OnFeatureCondition.class)
public @interface ConditionalOnFeature {
    String value();
}
