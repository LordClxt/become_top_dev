package app;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.AnnotatedBeanDefinition;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.beans.factory.support.BeanDefinitionRegistry;
import org.springframework.beans.factory.support.BeanDefinitionRegistryPostProcessor;
import org.springframework.context.EnvironmentAware;
import org.springframework.core.env.Environment;
import org.springframework.core.type.AnnotatedTypeMetadata;

/**
 * Retire du conteneur les beans des fonctionnalités désactivées, avant qu'ils ne soient créés.
 * Travaille sur les définitions (les recettes) : lire une annotation ne charge ni n'instancie la classe.
 */
public class FeatureTogglePostProcessor implements BeanDefinitionRegistryPostProcessor, EnvironmentAware {
    private Environment environment;
    private final List<String> disabled = new ArrayList<>();

    @Override
    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    // Appelé après ConfigurationClassPostProcessor (prioritaire) : les @Component scannés et les
    // méthodes @Bean sont déjà devenus des définitions.
    @Override
    public void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry) {
        for (String name : registry.getBeanDefinitionNames()) {
            String feature = featureOf(registry.getBeanDefinition(name));
            if (feature != null && !environment.getProperty("tixa.features." + feature, Boolean.class, true)) {
                registry.removeBeanDefinition(name);
                disabled.add(name);
            }
        }
        disabled.sort(null);
    }

    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) {
        // rien : tout se fait sur le registre de définitions
    }

    /** @Feature sur la méthode @Bean qui fabrique le bean, sinon sur la classe scannée. */
    private static String featureOf(BeanDefinition definition) {
        if (!(definition instanceof AnnotatedBeanDefinition annotated)) {
            return null;
        }
        AnnotatedTypeMetadata factoryMethod = annotated.getFactoryMethodMetadata();
        AnnotatedTypeMetadata source = factoryMethod != null ? factoryMethod : annotated.getMetadata();
        Map<String, Object> attributes = source.getAnnotationAttributes(Feature.class.getName());
        return attributes == null ? null : (String) attributes.get("value");
    }

    /** Noms des beans retirés, triés. */
    public List<String> disabledBeans() {
        return List.copyOf(disabled);
    }
}
