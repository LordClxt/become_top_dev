package app;

import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.ObjectFactory;
import org.springframework.beans.factory.annotation.AnnotatedBeanDefinition;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.core.type.MethodMetadata;
import org.springframework.util.ClassUtils;

/**
 * Refuse de démarrer quand un singleton reçoit directement un prototype : il ne le recevrait qu'une fois.
 * Tout se fait sur les définitions, avant la création du moindre bean : on charge des classes, on n'instancie rien.
 */
public class ScopeGuard implements BeanFactoryPostProcessor {

    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
        ClassLoader loader = beanFactory.getBeanClassLoader();

        // 1. Les prototypes et leur type, prédit sans instanciation (type de retour de la méthode @Bean, ou classe).
        Map<String, Class<?>> prototypes = new LinkedHashMap<>();
        for (String name : beanFactory.getBeanDefinitionNames()) {
            if (beanFactory.getBeanDefinition(name).isPrototype()) {
                Class<?> type = beanFactory.getType(name, false);
                if (type != null) prototypes.put(name, type);
            }
        }
        if (prototypes.isEmpty()) return;

        // 2. Chaque singleton : les types de ses points d'injection, comparés aux prototypes.
        List<String> violations = new ArrayList<>();
        for (String name : beanFactory.getBeanDefinitionNames()) {
            BeanDefinition definition = beanFactory.getBeanDefinition(name);
            if (!definition.isSingleton()) continue;
            for (Class<?> param : injectionPoints(definition, loader)) {
                if (ObjectFactory.class.isAssignableFrom(param)) continue;   // ObjectProvider, ObjectFactory : relu à chaque appel
                prototypes.forEach((proto, type) -> {
                    if (param.isAssignableFrom(type)) {
                        violations.add(name + " ← " + proto + " (" + type.getSimpleName() + ")");
                    }
                });
            }
        }
        if (!violations.isEmpty()) {
            violations.sort(null);
            throw new IllegalStateException("portée incohérente — un singleton reçoit un prototype une seule fois :\n  "
                    + String.join("\n  ", violations));
        }
    }

    /** Paramètres de la méthode @Bean, ou du constructeur utilisé pour une classe de composant. */
    private static List<Class<?>> injectionPoints(BeanDefinition definition, ClassLoader loader) {
        if (definition instanceof AnnotatedBeanDefinition annotated && annotated.getFactoryMethodMetadata() != null) {
            MethodMetadata factory = annotated.getFactoryMethodMetadata();
            Class<?> owner = load(factory.getDeclaringClassName(), loader);
            return owner == null ? List.of() : Arrays.stream(owner.getDeclaredMethods())
                    .filter(m -> m.getName().equals(factory.getMethodName()) && m.isAnnotationPresent(Bean.class))
                    .findFirst()
                    .map(Method::getParameterTypes).map(List::of).orElse(List.of());
        }
        Class<?> type = definition.getBeanClassName() == null ? null : load(definition.getBeanClassName(), loader);
        if (type == null) return List.of();
        Constructor<?>[] constructors = type.getDeclaredConstructors();
        Constructor<?> used = constructors.length == 1 ? constructors[0] : Arrays.stream(constructors)
                .filter(c -> c.isAnnotationPresent(Autowired.class)).findFirst().orElse(null);
        return used == null ? List.of() : List.of(used.getParameterTypes());
    }

    private static Class<?> load(String className, ClassLoader loader) {
        try {
            return ClassUtils.forName(className, loader);   // charge la classe, n'exécute aucun constructeur
        } catch (ClassNotFoundException | LinkageError e) {
            return null;
        }
    }
}
