package app;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.config.BeanPostProcessor;

/** Remplace chaque bean @Audited par un proxy qui journalise ses appels. */
public class AuditBeanPostProcessor implements BeanPostProcessor {
    private final ObjectProvider<AuditLog> auditLog;

    public AuditBeanPostProcessor(ObjectProvider<AuditLog> auditLog) {
        this.auditLog = auditLog;
    }

    // Après l'initialisation : @PostConstruct a déjà tourné sur le vrai objet, le proxy enveloppe un bean prêt.
    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        Class<?> type = bean.getClass();
        if (!type.isAnnotationPresent(Audited.class)) {
            return bean;
        }
        String owner = type.getSimpleName();
        return Proxy.newProxyInstance(type.getClassLoader(), type.getInterfaces(), (proxy, method, args) -> {
            if (method.getDeclaringClass() != Object.class) {
                auditLog.getObject().record(owner + "." + method.getName());
            }
            try {
                return method.invoke(bean, args);
            } catch (InvocationTargetException e) {
                throw e.getCause();   // l'appelant voit l'exception d'origine, pas l'enveloppe de la réflexion
            }
        });
    }
}
