package app;

import org.springframework.beans.factory.BeanRegistrar;
import org.springframework.beans.factory.BeanRegistry;
import org.springframework.core.env.Environment;

/** Enregistre un bean Notifier par canal listé dans la propriété tixa.notifiers. */
public class NotifierRegistrar implements BeanRegistrar {

    @Override
    public void register(BeanRegistry registry, Environment env) {
        // TODO
    }
}
