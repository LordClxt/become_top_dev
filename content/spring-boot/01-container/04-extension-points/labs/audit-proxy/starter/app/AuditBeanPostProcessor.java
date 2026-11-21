package app;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.config.BeanPostProcessor;

/** Remplace chaque bean @Audited par un proxy qui journalise ses appels. */
public class AuditBeanPostProcessor implements BeanPostProcessor {
    private final ObjectProvider<AuditLog> auditLog;

    public AuditBeanPostProcessor(ObjectProvider<AuditLog> auditLog) {
        this.auditLog = auditLog;
    }

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        // TODO : envelopper les beans @Audited dans un proxy JDK (java.lang.reflect.Proxy)
        return bean;
    }
}
